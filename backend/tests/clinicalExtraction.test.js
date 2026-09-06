import { describe, it, expect } from 'vitest';
import {
  clinicalExtractionService,
  parseAndValidateModelOutput,
  buildExtractionPrompt,
  qwenProvider,
  mockProvider,
  mapExtractionToUiOption,
} from '../src/modules/ai/index.js';
import { CLINICAL_CONCEPTS } from '../src/modules/questionEngine/clinicalConcepts.js';

describe('MediKiosk Phase 4 Clinical Slot Extraction Test Suite', () => {
  describe('Prompt Construction & Prompt Injection Defense (Section 33, 34, 35)', () => {
    it('constructs compact prompt with ontology constraints and untrusted patient boundary', () => {
      const { systemPrompt, userPrompt } = buildExtractionPrompt({
        rawTranscript: 'मला छातीत दुखत आहे',
        activeQuestion: {
          id: 'q.pain.location',
          concept: 'symptom.pain',
          attribute: 'location',
          text: { en: 'Where is the pain located?' },
        },
        allowedConcepts: CLINICAL_CONCEPTS,
      });

      expect(systemPrompt).toContain('DO NOT diagnose');
      expect(systemPrompt).toContain('DO NOT recommend treatments');
      expect(userPrompt).toContain('<PATIENT_INPUT>');
      expect(userPrompt).toContain('मला छातीत दुखत आहे');
      expect(userPrompt).toContain('Expected Concept: "symptom.pain"');
    });
  });

  describe('Multilingual Clinical Extraction (Section 15, 16, 48, 50)', () => {
    it('extracts chest pain location across English, Hindi, and Marathi with identical concept IDs', async () => {
      const enRes = await clinicalExtractionService.extract('I have pain in my chest');
      const hiRes = await clinicalExtractionService.extract('मेरे सीने में दर्द है');
      const mrRes = await clinicalExtractionService.extract('माझ्या छातीत दुखत आहे');

      expect(enRes.success).toBe(true);
      expect(hiRes.success).toBe(true);
      expect(mrRes.success).toBe(true);

      const enLocation = enRes.extractions.find((e) => e.attribute === 'location');
      const hiLocation = hiRes.extractions.find((e) => e.attribute === 'location');
      const mrLocation = mrRes.extractions.find((e) => e.attribute === 'location');

      expect(enLocation.concept).toBe('symptom.pain');
      expect(hiLocation.concept).toBe('symptom.pain');
      expect(mrLocation.concept).toBe('symptom.pain');

      expect(enLocation.value).toBe('chest');
      expect(hiLocation.value).toBe('chest');
      expect(mrLocation.value).toBe('chest');
    });

    it('extracts duration correctly (fever for 3 days)', async () => {
      const res = await clinicalExtractionService.extract('मला तीन दिवसांपासून ताप आहे');
      expect(res.success).toBe(true);

      const durationSlot = res.extractions.find((e) => e.attribute === 'duration');
      expect(durationSlot).toBeDefined();
      expect(durationSlot.value).toBe(3);
      expect(durationSlot.unit).toBe('days');
    });

    it('extracts vomiting and duration correctly in Marathi ("मला तीन दिवसांपासून रोज उलटी होत आहे")', async () => {
      const res = await clinicalExtractionService.extract('मला तीन दिवसांपासून रोज उलटी होत आहे');
      expect(res.success).toBe(true);

      const vomitingSlot = res.extractions.find((e) => e.concept === 'symptom.vomiting' && e.attribute === 'presence');
      expect(vomitingSlot).toBeDefined();
      expect(vomitingSlot.value).toBe(true);
      expect(vomitingSlot.status).toBe('PRESENT');

      const durationSlot = res.extractions.find((e) => e.concept === 'symptom.vomiting' && e.attribute === 'duration');
      expect(durationSlot).toBeDefined();
      expect(durationSlot.value).toBe(3);
      expect(durationSlot.unit).toBe('days');

      // Regression: Must NOT extract chest pain!
      const chestSlot = res.extractions.find((e) => e.concept === 'symptom.pain.chest');
      expect(chestSlot).toBeUndefined();
    });

    it('extracts vomiting and duration equivalently across Hindi and English', async () => {
      const hiRes = await clinicalExtractionService.extract('मुझे तीन दिनों से रोज उल्टी हो रही है');
      const enRes = await clinicalExtractionService.extract('I have been vomiting every day for three days');

      expect(hiRes.success).toBe(true);
      expect(enRes.success).toBe(true);

      const hiVomit = hiRes.extractions.find((e) => e.concept === 'symptom.vomiting' && e.attribute === 'presence');
      const enVomit = enRes.extractions.find((e) => e.concept === 'symptom.vomiting' && e.attribute === 'presence');
      expect(hiVomit).toBeDefined();
      expect(enVomit).toBeDefined();

      const hiDuration = hiRes.extractions.find((e) => e.concept === 'symptom.vomiting' && e.attribute === 'duration');
      const enDuration = enRes.extractions.find((e) => e.concept === 'symptom.vomiting' && e.attribute === 'duration');
      expect(hiDuration.value).toBe(3);
      expect(enDuration.value).toBe(3);
    });
  });

  describe('Multi-Slot Extraction (Section 25)', () => {
    it('extracts multiple facts from a single utterance (fever + 3 days + cough)', async () => {
      const res = await clinicalExtractionService.extract('मला तीन दिवसांपासून ताप आहे आणि खोकलाही आहे');
      expect(res.success).toBe(true);
      expect(res.extractions.length).toBeGreaterThanOrEqual(2);

      const concepts = res.extractions.map((e) => e.concept);
      expect(concepts).toContain('symptom.fever');
      expect(concepts).toContain('symptom.cough');
    });
  });

  describe('Negative & Unknown Semantics (Section 18, 19, 38, 39)', () => {
    it('extracts explicit negative statements with status ABSENT and attribute presence (Section 5)', async () => {
      const res = await clinicalExtractionService.extract('मुझे बुखार नहीं है');
      expect(res.success).toBe(true);

      const feverSlot = res.extractions.find((e) => e.concept === 'symptom.fever');
      expect(feverSlot).toBeDefined();
      expect(feverSlot.status).toBe('ABSENT');
      // Regression check: Must NOT fabricate duration = 0 from absence!
      expect(feverSlot.attribute).toBe('presence');
      expect(feverSlot.value).toBe(false);

      const durationSlot = res.extractions.find((e) => e.concept === 'symptom.fever' && e.attribute === 'duration');
      expect(durationSlot).toBeUndefined();
    });

    it('extracts uncertainty with status UNKNOWN', async () => {
      const res = await clinicalExtractionService.extract('मला माहित नाही नक्की');
      expect(res.success).toBe(true);

      const unknownSlot = res.extractions[0];
      expect(unknownSlot.status).toBe('UNKNOWN');
      expect(unknownSlot.confidence).toBeNull();
    });
  });

  describe('Hallucination & Safety Prevention (Section 13, 53, 54)', () => {
    it('does NOT fabricate chest or severe when patient only says general pain', async () => {
      const res = await clinicalExtractionService.extract('I have pain');
      expect(res.success).toBe(true);

      const locationSlot = res.extractions.find((e) => e.attribute === 'location');
      const severitySlot = res.extractions.find((e) => e.attribute === 'severity');

      expect(locationSlot).toBeUndefined();
      expect(severitySlot).toBeUndefined();
    });

    it('rejects diagnostic, emergency, and triage fields from model output', () => {
      const fakeOutput = JSON.stringify({
        extractions: [
          {
            concept: 'symptom.pain',
            attribute: 'location',
            value: 'chest',
            status: 'PRESENT',
          },
          {
            concept: 'diagnosis.cardiac',
            attribute: 'diagnosis',
            value: 'Myocardial Infarction',
            status: 'PRESENT',
          },
          {
            concept: 'symptom.pain',
            attribute: 'triage',
            value: 'EMERGENCY',
            status: 'PRESENT',
          },
          {
            concept: 'symptom.pain',
            attribute: 'emergency',
            value: 'CRITICAL',
            status: 'PRESENT',
          },
        ],
      });

      const parsed = parseAndValidateModelOutput(fakeOutput);
      expect(parsed.success).toBe(true);
      // Both diagnosis, emergency, and triage must be filtered out!
      expect(parsed.extractions.length).toBe(1);
      expect(parsed.extractions[0].attribute).toBe('location');
    });

    it('rejects unsupported attributes for known concepts', () => {
      const outputWithBadAttr = JSON.stringify({
        extractions: [
          {
            concept: 'symptom.fever',
            attribute: 'radiation', // Radiation is not valid for fever!
            value: 'LEFT_ARM',
            status: 'PRESENT',
          },
        ],
      });

      const parsed = parseAndValidateModelOutput(outputWithBadAttr);
      expect(parsed.success).toBe(true);
      expect(parsed.extractions.length).toBe(0);
    });

    it('rejects fabricated duration=0 for absent symptoms', () => {
      const outputWithFakeDuration = JSON.stringify({
        extractions: [
          {
            concept: 'symptom.fever',
            attribute: 'duration',
            value: 0,
            status: 'ABSENT',
          },
        ],
      });

      const parsed = parseAndValidateModelOutput(outputWithFakeDuration);
      expect(parsed.success).toBe(true);
      expect(parsed.extractions.length).toBe(0);
    });
  });

  describe('Model Output Parsing & Schema Validation (Section 12, 48)', () => {
    it('strips markdown code blocks and parses clean JSON', () => {
      const rawWithFences = '```json\n{"extractions": [{"concept": "symptom.pain", "attribute": "location", "value": "chest", "status": "PRESENT"}]}\n```';
      const parsed = parseAndValidateModelOutput(rawWithFences);
      expect(parsed.success).toBe(true);
      expect(parsed.extractions[0].value).toBe('chest');
    });

    it('rejects malformed JSON gracefully', () => {
      const invalidJson = '{"extractions": [{"concept": "symptom.pain", "attribute": chest}]}';
      const parsed = parseAndValidateModelOutput(invalidJson);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('Malformed JSON');
    });

    it('rejects unknown ontology concepts', () => {
      const unknownConcept = JSON.stringify({
        extractions: [
          {
            concept: 'unknown.alien.disease',
            attribute: 'level',
            value: 'high',
            status: 'PRESENT',
          },
        ],
      });
      const parsed = parseAndValidateModelOutput(unknownConcept);
      expect(parsed.success).toBe(true);
      expect(parsed.extractions.length).toBe(0);
    });
  });

  describe('AI Failure Safety & Fallback Behavior (Section 8, 9, 28)', () => {
    it('returns fallbackToTouch and zero extractions when qwen runtime is unavailable', async () => {
      const originalMode = clinicalExtractionService.config.mode;
      try {
        clinicalExtractionService.config.mode = 'qwen';
        // Qwen runtime is offline on this machine; request will fail or time out
        const res = await clinicalExtractionService.extract('मला छातीत तीव्र वेदना होत आहेत');
        expect(res.success).toBe(false);
        expect(res.fallbackToTouch).toBe(true);
        expect(res.extractions).toEqual([]);
        // Crucial: Must NOT have fabricated facts via mockProvider!
      } finally {
        clinicalExtractionService.config.mode = originalMode;
      }
    });
  });

  describe('Phase 6.1 — Natural Language Clinical Answer Extraction (Section 17 & 21)', () => {
    it('TEST A: extracts breathing difficulty and duration from "मुझे 4 दिन से सांस लेने में बहुत ही तकलीफ हो रही"', async () => {
      const res = await clinicalExtractionService.extract('मुझे 4 दिन से सांस लेने में बहुत ही तकलीफ हो रही');
      expect(res.success).toBe(true);

      const dyspneaSlot = res.extractions.find(
        (e) => (e.concept === 'symptom.dyspnea' || e.concept === 'symptom.breathing') && e.attribute === 'presence'
      );
      expect(dyspneaSlot).toBeDefined();
      expect(dyspneaSlot.value).toBe(true);

      const durationSlot = res.extractions.find((e) => e.attribute === 'duration');
      expect(durationSlot).toBeDefined();
      expect(durationSlot.value).toBe(4);
      expect(durationSlot.unit).toBe('days');
    });

    it('TEST B: extracts duration range from elliptical "छह सात दिनों से." when question targets duration', async () => {
      const activeQuestion = {
        id: 'dyn.symptom.dyspnea.duration',
        targetConcept: 'symptom.dyspnea',
        targetAttribute: 'duration',
        text: 'यह तकलीफ़ कितने समय से है?',
      };

      const res = await clinicalExtractionService.extract('छह सात दिनों से.', activeQuestion);
      expect(res.success).toBe(true);

      const durationSlot = res.extractions.find((e) => e.attribute === 'duration');
      expect(durationSlot).toBeDefined();
      expect(durationSlot.value).toEqual({ min: 6, max: 7, unit: 'days' });
    });

    it('TEST C: extracts MODERATE severity from "काफी समय से है और moderate level की है." without selecting random option', async () => {
      const activeQuestion = {
        id: 'dyn.symptom.dyspnea.severity',
        targetConcept: 'symptom.dyspnea',
        targetAttribute: 'severity',
        text: 'इसकी severity कैसी है?',
        options: [
          { value: 'MILD', label: 'हल्का' },
          { value: 'MODERATE', label: 'मध्यम' },
          { value: 'SEVERE', label: 'तीव्र' },
        ],
      };

      const res = await clinicalExtractionService.extract('काफी समय से है और moderate level की है.', activeQuestion);
      expect(res.success).toBe(true);

      const severitySlot = res.extractions.find((e) => e.attribute === 'severity');
      expect(severitySlot).toBeDefined();
      expect(severitySlot.value).toBe('MODERATE');

      // Also verifies vague duration is separately preserved without inventing numbers
      const durationSlot = res.extractions.find((e) => e.attribute === 'duration');
      expect(durationSlot).toBeDefined();
      expect(durationSlot.value).toBeNull();
      expect(durationSlot.precision).toBe('vague');
    });

    it('TEST D: extracts SEVERE severity from "बहुत ज्यादा है."', async () => {
      const activeQuestion = {
        id: 'dyn.symptom.dyspnea.severity',
        targetConcept: 'symptom.dyspnea',
        targetAttribute: 'severity',
        text: 'इसकी severity कैसी है?',
      };

      const res = await clinicalExtractionService.extract('बहुत ज्यादा है.', activeQuestion);
      expect(res.success).toBe(true);

      const severitySlot = res.extractions.find((e) => e.attribute === 'severity');
      expect(severitySlot).toBeDefined();
      expect(severitySlot.value).toBe('SEVERE');
    });

    it('TEST E: does NOT invent numbers for vague duration "काफी समय से."', async () => {
      const activeQuestion = {
        id: 'dyn.symptom.pain.duration',
        targetConcept: 'symptom.pain',
        targetAttribute: 'duration',
        text: 'कितने दिनों से?',
      };

      const res = await clinicalExtractionService.extract('काफी समय से.', activeQuestion);
      expect(res.success).toBe(true);

      const durationSlot = res.extractions.find((e) => e.attribute === 'duration');
      expect(durationSlot).toBeDefined();
      expect(durationSlot.value).toBeNull();
      expect(durationSlot.precision).toBe('vague');
      expect(durationSlot.value).not.toBe(3);
      expect(durationSlot.value).not.toBe(7);
    });

    it('TEST F: preserves negation from "नहीं, बिल्कुल नहीं." for swelling question', async () => {
      const activeQuestion = {
        id: 'dyn.symptom.injury.swelling',
        targetConcept: 'symptom.injury',
        targetAttribute: 'swelling',
        text: 'क्या सूजन है?',
      };

      const res = await clinicalExtractionService.extract('नहीं, बिल्कुल नहीं.', activeQuestion);
      expect(res.success).toBe(true);

      const swellingSlot = res.extractions.find((e) => e.attribute === 'swelling');
      expect(swellingSlot).toBeDefined();
      expect(swellingSlot.value).toBe(false);
      expect(swellingSlot.status).toBe('ABSENT');
    });

    it('TEST G: extracts multiple facts in single sentence ("मुझे करीब सात दिन से सांस लेने में तकलीफ है और अभी moderate है.")', async () => {
      const res = await clinicalExtractionService.extract('मुझे करीब सात दिन से सांस लेने में तकलीफ है और अभी moderate है.');
      expect(res.success).toBe(true);

      const dyspneaSlot = res.extractions.find((e) => e.attribute === 'presence' && (e.concept === 'symptom.dyspnea' || e.concept === 'symptom.breathing'));
      const durationSlot = res.extractions.find((e) => e.attribute === 'duration');
      const severitySlot = res.extractions.find((e) => e.attribute === 'severity');

      expect(dyspneaSlot).toBeDefined();
      expect(durationSlot).toBeDefined();
      expect(durationSlot.value).toEqual({ min: 7, max: 7, unit: 'days' });
      expect(severitySlot).toBeDefined();
      expect(severitySlot.value).toBe('MODERATE');
    });

    it('TEST H: extracts Marathi natural duration expressions ("६-७ दिवसांपासून", "गेले काही दिवस")', async () => {
      const rangeRes = await clinicalExtractionService.extract('माझा गुडघा ६-७ दिवसांपासून दुखतोय');
      expect(rangeRes.success).toBe(true);
      const rangeSlot = rangeRes.extractions.find((e) => e.attribute === 'duration');
      expect(rangeSlot.value).toEqual({ min: 6, max: 7, unit: 'days' });

      const vagueRes = await clinicalExtractionService.extract('गेले काही दिवस खूप त्रास होतोय');
      expect(vagueRes.success).toBe(true);
      const vagueSlot = vagueRes.extractions.find((e) => e.attribute === 'duration');
      expect(vagueSlot.value).toBeNull();
      expect(vagueSlot.precision).toBe('vague');
    });

    it('TEST I: preserves uncertainty without default selection ("पता नहीं, कभी कम कभी ज्यादा रहती है")', async () => {
      const activeQuestion = {
        id: 'dyn.symptom.dyspnea.severity',
        targetConcept: 'symptom.dyspnea',
        targetAttribute: 'severity',
        text: 'तीव्रता कैसी है?',
        options: ['MILD', 'MODERATE', 'SEVERE'],
      };

      const res = await clinicalExtractionService.extract('पता नहीं, कभी कम कभी ज्यादा रहती है', activeQuestion);
      expect(res.success).toBe(true);

      const sevSlot = res.extractions.find((e) => e.attribute === 'severity');
      expect(sevSlot).toBeDefined();
      expect(sevSlot.status).toBe('UNKNOWN');
      expect(sevSlot.value).toBeNull();
    });
  });

  describe('Phase 6.3 — Contextual Voice Answer Mapping & Option Selection (Sections 16, 17, 18)', () => {
    const radiationQuestion = {
      id: 'dyn.symptom.pain.chest.radiation',
      targetConcept: 'symptom.pain.chest',
      targetAttribute: 'radiation',
      text: 'Does this pain radiate to your left arm, jaw, or back?',
      options: [
        { id: 'yes_spreads', label: 'Yes, spreads' },
        { id: 'no_only_chest', label: 'No, only in chest' },
        { id: 'not_sure', label: 'Not sure' },
      ],
    };

    it('SECTION 16 REGRESSION TEST — EXACT BUG: "yes it\'s spreads a little" maps to radiation=true and "yes_spreads"', async () => {
      const res = await clinicalExtractionService.extract("yes it's spreads a little", radiationQuestion);

      expect(res.success).toBe(true);
      expect(res.answersCurrentQuestion).toBe(true);
      expect(res.targetAttribute).toBe('radiation');
      expect(res.value).toBe(true);
      expect(res.mappedOption).toBe('yes_spreads');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.rawTranscript).toBe("yes it's spreads a little");

      const radSlot = res.extractions.find((e) => e.attribute === 'radiation');
      expect(radSlot).toBeDefined();
      expect(radSlot.value).toBe(true);
      expect(radSlot.status).toBe('PRESENT');
      expect(radSlot.radiationExtent).toBe('mild');
    });

    it('SECTION 17 MULTILINGUAL TEST: English, Hindi, Marathi positive radiation statements map to YES / SPREADS', async () => {
      const enRes = await clinicalExtractionService.extract('yes it spreads a little', radiationQuestion);
      expect(enRes.success).toBe(true);
      expect(enRes.value).toBe(true);
      expect(enRes.mappedOption).toBe('yes_spreads');

      const hiRes = await clinicalExtractionService.extract('हाँ, थोड़ा फैलता है', radiationQuestion);
      expect(hiRes.success).toBe(true);
      expect(hiRes.value).toBe(true);
      expect(hiRes.mappedOption).toBe('yes_spreads');

      const mrRes = await clinicalExtractionService.extract('हो, थोडं पसरतंय', radiationQuestion);
      expect(mrRes.success).toBe(true);
      expect(mrRes.value).toBe(true);
      expect(mrRes.mappedOption).toBe('yes_spreads');
    });

    it('SECTION 17 MULTILINGUAL TEST: Negative responses map to NO / ONLY CHEST (radiation=false)', async () => {
      const enRes = await clinicalExtractionService.extract('No, only in my chest', radiationQuestion);
      expect(enRes.success).toBe(true);
      expect(enRes.value).toBe(false);
      expect(enRes.mappedOption).toBe('no_only_chest');

      const hiRes = await clinicalExtractionService.extract('नहीं, सिर्फ छाती में है', radiationQuestion);
      expect(hiRes.success).toBe(true);
      expect(hiRes.value).toBe(false);
      expect(hiRes.mappedOption).toBe('no_only_chest');

      const mrRes = await clinicalExtractionService.extract('नाही, फक्त छातीत आहे', radiationQuestion);
      expect(mrRes.success).toBe(true);
      expect(mrRes.value).toBe(false);
      expect(mrRes.mappedOption).toBe('no_only_chest');
    });

    it('SECTION 17 MULTILINGUAL TEST: Unknown responses map to NOT SURE (status=UNKNOWN)', async () => {
      const enRes = await clinicalExtractionService.extract("I'm not sure", radiationQuestion);
      expect(enRes.success).toBe(true);
      expect(enRes.mappedOption).toBe('not_sure');

      const hiRes = await clinicalExtractionService.extract('मुझे पता नहीं', radiationQuestion);
      expect(hiRes.success).toBe(true);
      expect(hiRes.mappedOption).toBe('not_sure');

      const mrRes = await clinicalExtractionService.extract('मला माहित नाही', radiationQuestion);
      expect(mrRes.success).toBe(true);
      expect(mrRes.mappedOption).toBe('not_sure');
    });

    it('SECTION 11 NON-FORCING: Off-topic utterance does NOT force YES or NO', async () => {
      const res = await clinicalExtractionService.extract('my chest hurts more when I walk', radiationQuestion);
      expect(res.success).toBe(true);
      const radSlot = res.extractions.find((e) => e.attribute === 'radiation');
      expect(radSlot).toBeUndefined();
      expect(res.mappedOption).toBeNull();
    });

    it('SECTION 6 QUALIFIED ANSWERS: Preserves specific radiation sites and qualifiers', async () => {
      const armRes = await clinicalExtractionService.extract('yes pain goes to my left arm', radiationQuestion);
      expect(armRes.success).toBe(true);
      expect(armRes.value).toBe('LEFT_ARM');
      expect(armRes.mappedOption).toBe('yes_spreads');

      const backRes = await clinicalExtractionService.extract('sometimes it goes to my back', radiationQuestion);
      expect(backRes.success).toBe(true);
      expect(backRes.value).toBe('BACK');
      const backSlot = backRes.extractions.find((e) => e.attribute === 'radiation');
      expect(backSlot.radiationFrequency).toBe('sometimes');
    });
  });
});
