/**
 * High-Fidelity Mock Extraction Provider (Section 31 & 32)
 * Deterministic multi-slot clinical extraction for development, testing, and zero-GPU environments.
 */

import { segmentClauses } from '../utils/clauseSegmenter.js';

export const mockProvider = {
  name: 'mock-clinical-extractor',

  async generateStructuredExtraction(systemPrompt, userPrompt) {
    const startTime = Date.now();
    const inputMatch = userPrompt.match(/<PATIENT_INPUT>([\s\S]*?)<\/PATIENT_INPUT>/i);
    const rawText = (inputMatch ? inputMatch[1] : userPrompt).toLowerCase().trim();
    const clauses = segmentClauses(rawText);

    const ctxMatch = userPrompt.match(/ACTIVE QUESTION CONTEXT:([\s\S]*?)<PATIENT_INPUT>/i);
    const activeContext = ctxMatch ? ctxMatch[1].toLowerCase() : '';
    const expConceptMatch = activeContext.match(/expected concept:\s*"([^"]+)"/i);
    const expAttrMatch = activeContext.match(/expected attribute:\s*"([^"]+)"/i);
    const expectedConcept = expConceptMatch ? expConceptMatch[1].toLowerCase() : '';
    const expectedAttribute = expAttrMatch ? expAttrMatch[1].toLowerCase() : '';

    const extractions = [];

    // 1. Unknown / Uncertainty Check (PART F, J, Test 11, Phase 7 Section 14)
    const isExplicitUncertain =
      rawText.includes('माहीत नाही') ||
      rawText.includes('माहित नाही') ||
      rawText.includes('काही माहित नाही') ||
      rawText.includes('काही माहीत नाही') ||
      rawText.includes('नक्की माहित नाही') ||
      rawText.includes('नक्की माहीत नाही') ||
      rawText.includes('मला माहित नाही') ||
      rawText.includes('मला माहीत नाही') ||
      rawText.includes('काय माहित') ||
      rawText.includes('काय माहीत') ||
      rawText.includes('नक्की सांगता येत नाही') ||
      rawText.includes('सांगता येत नाही') ||
      rawText.includes('पता नहीं') ||
      rawText.includes('कुछ पता नहीं') ||
      rawText.includes('मुझे पता नहीं') ||
      rawText.includes('मुझे नहीं पता') ||
      rawText.includes("don't know") ||
      rawText.includes('not sure') ||
      rawText.includes("i'm not sure") ||
      rawText.includes('unknown');

    if (isExplicitUncertain) {
      let targetConcept = expectedConcept || 'symptom.pain';
      let targetAttr = expectedAttribute || 'location';

      if (rawText.includes('सूज') || rawText.includes('सूजन') || expectedAttribute.includes('swelling')) {
        targetConcept = 'symptom.injury';
        targetAttr = 'swelling';
      } else if (rawText.includes('पसर') || rawText.includes('फैल') || expectedAttribute.includes('radiation')) {
        targetConcept = 'symptom.pain.chest';
        targetAttr = 'radiation';
      } else if (expectedAttribute.includes('severity')) {
        targetAttr = 'severity';
      } else if (expectedAttribute.includes('duration')) {
        targetAttr = 'duration';
      }

      extractions.push({
        concept: targetConcept,
        attribute: targetAttr,
        value: targetAttr === 'radiation' ? 'unknown' : null,
        status: 'UNKNOWN',
        confidence: null,
        raw: rawText,
      });

      // If patient ONLY stated uncertainty, we can conclude immediately.
      // If patient also gave other symptoms (e.g. "गुडघा दुखतोय पण सूज माहित नाही"), proceed to extract the remaining facts!
      const pureUncertain =
        rawText === 'माहित नाही' ||
        rawText === 'मला माहित नाही' ||
        rawText === 'काय माहित' ||
        rawText === 'नक्की माहित नाही' ||
        rawText === 'पता नहीं' ||
        rawText === 'मुझे नहीं पता' ||
        rawText === 'not sure' ||
        rawText === "don't know";

      if (pureUncertain) {
        return {
          success: true,
          rawOutput: JSON.stringify({ extractions, answersCurrentQuestion: true }),
          latency: Date.now() - startTime,
        };
      }
    }

    // 2. Negative Statement Checks (Section 18, PART G) & Positive Fever Extraction
    if (
      rawText.includes('ताप नाही') ||
      rawText.includes('बुखार नहीं') ||
      rawText.includes('no fever') ||
      rawText.includes('not having fever')
    ) {
      extractions.push({
        concept: 'symptom.fever',
        attribute: 'presence',
        value: false,
        status: 'ABSENT',
        confidence: 0.95,
      });
    } else if (rawText.includes('ताप') || rawText.includes('बुखार') || rawText.includes('fever')) {
      extractions.push({
        concept: 'symptom.fever',
        attribute: 'presence',
        value: true,
        status: 'PRESENT',
        confidence: 0.98,
      });
    }

    // Vomit Negation (PART G, Test 7: "नाही रे, उलटी वगैरे काही होत नाही")
    const isVomitNegative =
      rawText.includes('उलटी नाही') ||
      rawText.includes('उल्टी नहीं') ||
      rawText.includes('no vomit') ||
      rawText.includes('not vomiting') ||
      rawText.includes('उलटी वगैरे') ||
      rawText.includes('उलटी होत नाही') ||
      rawText.includes('उल्टी नहीं होती') ||
      ((rawText.includes('नाही') || rawText.includes('नाहीये') || rawText.includes('नहीं') || rawText.includes('no')) &&
        (rawText.includes('उलटी') || rawText.includes('उल्टी') || rawText.includes('vomit') || activeContext.includes('vomit')));

    if (isVomitNegative) {
      extractions.push({
        concept: 'symptom.vomiting',
        attribute: 'presence',
        value: false,
        status: 'ABSENT',
        confidence: 0.96,
      });
    }

    // 3. Diarrhea Extraction (Critical for screenshot bug fix)
    if (
      rawText.includes('जुलाब') ||
      rawText.includes('अतिसार') ||
      rawText.includes('दस्त') ||
      rawText.includes('loose motion') ||
      rawText.includes('diarrhea') ||
      rawText.includes('diarrhoea')
    ) {
      extractions.push({
        concept: 'symptom.diarrhea',
        attribute: 'presence',
        value: true,
        status: 'PRESENT',
        confidence: 0.98,
      });
    }

    // 4. Location & Complaint Extraction
    if (rawText.includes('खांद') || rawText.includes('कंध') || rawText.includes('shoulder')) {
      extractions.push({
        concept: 'symptom.pain.shoulder',
        attribute: 'presence',
        value: true,
        status: 'PRESENT',
        confidence: 0.98,
      });
      extractions.push({
        concept: 'symptom.pain.shoulder',
        attribute: 'location',
        value: 'shoulder',
        status: 'PRESENT',
        confidence: 0.98,
      });
      extractions.push({
        concept: 'symptom.pain',
        attribute: 'location',
        value: 'shoulder',
        status: 'PRESENT',
        confidence: 0.98,
      });
    } else if (rawText.includes('छाती') || rawText.includes('सीने') || rawText.includes('सीना') || rawText.includes('chest')) {
      extractions.push({
        concept: 'symptom.pain',
        attribute: 'location',
        value: 'chest',
        status: 'PRESENT',
        confidence: 0.98,
      });
    } else if (rawText.includes('गुडघ') || rawText.includes('घुटन') || rawText.includes('knee')) {
      extractions.push({
        concept: 'symptom.pain',
        attribute: 'location',
        value: 'knee',
        status: 'PRESENT',
        confidence: 0.95,
      });
    } else if (rawText.includes('पोट') || rawText.includes('पेट') || rawText.includes('stomach') || rawText.includes('abdomen')) {
      extractions.push({
        concept: 'symptom.pain',
        attribute: 'location',
        value: 'abdomen',
        status: 'PRESENT',
        confidence: 0.95,
      });
      if (
        rawText.includes('आग') ||
        rawText.includes('जलन') ||
        rawText.includes('जळतं') ||
        rawText.includes('बिघडलं') ||
        rawText.includes('वाट लागली')
      ) {
        extractions.push({
          concept: 'symptom.pain.abdominal',
          attribute: 'presence',
          value: true,
          status: 'PRESENT',
          confidence: 0.95,
        });
        if (rawText.includes('आग') || rawText.includes('जलन') || rawText.includes('जळतं')) {
          extractions.push({
            concept: 'symptom.pain.abdominal',
            attribute: 'character',
            value: 'burning',
            status: 'PRESENT',
            confidence: 0.94,
          });
        }
      }
    }

    // 4b. Radiation / Pain Spread Extraction (Phase 6.3)
    const isRadiationContext =
      expectedAttribute.includes('radiation') ||
      activeContext.includes('radiation') ||
      activeContext.includes('radiate') ||
      activeContext.includes('पसर') ||
      activeContext.includes('फैल');

    if (isRadiationContext) {
      const isNegative =
        rawText.includes('only in') ||
        rawText.includes('only in chest') ||
        rawText.includes('only in my chest') ||
        rawText.includes('stays') ||
        rawText.includes('no') ||
        rawText.includes('not') ||
        rawText.includes('नाही') ||
        rawText.includes('नाहीये') ||
        rawText.includes('नाही तसं') ||
        rawText.includes('तसं काही नाही') ||
        rawText.includes('काही नाही') ||
        rawText.includes('पसरत नाही') ||
        rawText.includes('नहीं') ||
        rawText.includes('फैलता नहीं') ||
        rawText.includes('फक्त छातीत') ||
        rawText.includes('छातीतच') ||
        rawText.includes('सिर्फ छाती') ||
        rawText.includes('सिर्फ सीने') ||
        rawText.includes('केवल सीने') ||
        rawText.includes('कहीं नहीं') ||
        rawText.includes('कुठेही नाही') ||
        rawText.includes('कुठेही पसरत नाही') ||
        rawText.includes('अजिबात नाही');

      const isPositive =
        rawText.includes('yes') ||
        rawText.includes('हो') ||
        rawText.includes('होय') ||
        rawText.includes('हाँ') ||
        rawText.includes('haan') ||
        rawText.includes('हा') ||
        rawText.includes('spread') ||
        rawText.includes('spreads') ||
        rawText.includes('spreading') ||
        rawText.includes('पसर') ||
        rawText.includes('पसरत') ||
        rawText.includes('पसरतंय') ||
        rawText.includes('पसरते') ||
        rawText.includes('फैल') ||
        rawText.includes('फैलता') ||
        rawText.includes('arm') ||
        rawText.includes('हात') ||
        rawText.includes('हाथ') ||
        rawText.includes('shoulder') ||
        rawText.includes('jaw') ||
        rawText.includes('जबड़') ||
        rawText.includes('neck') ||
        rawText.includes('back') ||
        rawText.includes('पीठ') ||
        rawText.includes('पाठी');

      // Negation has ABSOLUTE priority over positive symptom keywords
      if (isNegative) {
        extractions.push({
          concept: expectedConcept || 'symptom.pain.chest',
          attribute: 'radiation',
          value: false,
          status: 'ABSENT',
          confidence: 0.95,
          raw: rawText,
        });
      } else if (isPositive) {
        let val = true;
        let radiationLocation = null;
        let radiationSide = null;

        const isArm = rawText.includes('arm') || rawText.includes('हाता') || rawText.includes('हाथ') || rawText.includes('shoulder') || rawText.includes('खांद्या');
        const isLeft = rawText.includes('left') || rawText.includes('डाव्या') || rawText.includes('डावा') || rawText.includes('बाएं') || rawText.includes('बायां');
        const isRight = rawText.includes('right') || rawText.includes('उजव्या') || rawText.includes('उजवा') || rawText.includes('दाएं') || rawText.includes('दायां');

        if (isArm) {
          radiationLocation = 'arm';
          if (isLeft) {
            val = 'LEFT_ARM';
            radiationSide = 'left';
          } else if (isRight) {
            val = 'RIGHT_ARM';
            radiationSide = 'right';
          } else {
            val = true;
            radiationSide = 'unknown';
          }
        } else if (rawText.includes('jaw') || rawText.includes('neck') || rawText.includes('जबड़') || rawText.includes('माने') || rawText.includes('हनुवटी')) {
          val = 'JAW_NECK';
          radiationLocation = 'jaw_neck';
        } else if (rawText.includes('back') || rawText.includes('पीठ') || rawText.includes('पाठी')) {
          val = 'BACK';
          radiationLocation = 'back';
        }

        const extObj = {
          concept: expectedConcept || 'symptom.pain.chest',
          attribute: 'radiation',
          value: val,
          status: 'PRESENT',
          confidence: 0.95,
          raw: rawText,
        };

        if (radiationLocation) extObj.radiationLocation = radiationLocation;
        if (radiationSide) extObj.radiationSide = radiationSide;

        if (rawText.includes('sometimes') || rawText.includes('कधी कधी') || rawText.includes('कभी कभी')) {
          extObj.radiationFrequency = 'sometimes';
        }
        if (rawText.includes('little') || rawText.includes('थोड़ा') || rawText.includes('थोडं') || rawText.includes('mild')) {
          extObj.radiationExtent = 'mild';
        }

        extractions.push(extObj);
      }
    } else if (
      (rawText.includes('spread') ||
        rawText.includes('spreads') ||
        rawText.includes('पसर') ||
        rawText.includes('जातेय') ||
        rawText.includes('जात') ||
        rawText.includes('जा रहा') ||
        rawText.includes('जा रही') ||
        rawText.includes('फैलता')) &&
      !rawText.includes('नाही') &&
      !rawText.includes('नहीं') &&
      !rawText.includes('no')
    ) {
      let val = true;
      let radiationLocation = null;
      let radiationSide = null;

      const isArm = rawText.includes('arm') || rawText.includes('हाता') || rawText.includes('हाथ');
      const isLeft = rawText.includes('left') || rawText.includes('डाव्या') || rawText.includes('डावा') || rawText.includes('बाएं');
      const isRight = rawText.includes('right') || rawText.includes('उजव्या') || rawText.includes('उजवा') || rawText.includes('दाएं');

      if (isArm) {
        radiationLocation = 'arm';
        if (isLeft) {
          val = 'LEFT_ARM';
          radiationSide = 'left';
        } else if (isRight) {
          val = 'RIGHT_ARM';
          radiationSide = 'right';
        } else {
          val = true;
          radiationSide = 'unknown';
        }
      } else if (rawText.includes('jaw') || rawText.includes('जबड़')) {
        val = 'JAW_NECK';
        radiationLocation = 'jaw_neck';
      } else if (rawText.includes('back') || rawText.includes('पीठ') || rawText.includes('पाठी')) {
        val = 'BACK';
        radiationLocation = 'back';
      }

      const extObj = {
        concept: 'symptom.pain.chest',
        attribute: 'radiation',
        value: val,
        status: 'PRESENT',
        confidence: 0.94,
        raw: rawText,
      };
      if (radiationLocation) extObj.radiationLocation = radiationLocation;
      if (radiationSide) extObj.radiationSide = radiationSide;
      extractions.push(extObj);
    }

    // 5. Injury / Trauma / Fall Extraction
    const isTraumaContext =
      expectedAttribute.includes('mechanism') ||
      expectedConcept.includes('injury') ||
      activeContext.includes('injury') ||
      activeContext.includes('trauma') ||
      activeContext.includes('दुखापत') ||
      activeContext.includes('चोट') ||
      activeContext.includes('पडलो') ||
      activeContext.includes('गिरे');

    const isTraumaNegative =
      rawText.includes('दुखापत नाही') ||
      rawText.includes('चोट नहीं') ||
      rawText.includes('पडलो नाही') ||
      rawText.includes('पडला नाही') ||
      rawText.includes('गिर नहीं') ||
      rawText.includes('no injury') ||
      rawText.includes('no fall') ||
      rawText.includes('did not fall') ||
      rawText.includes("didn't fall") ||
      (isTraumaContext &&
        (rawText.includes('नाही') ||
          rawText.includes('नाहीये') ||
          rawText.includes('नहीं') ||
          rawText.includes('no')));

    if (isTraumaNegative) {
      extractions.push({
        concept: 'symptom.injury',
        attribute: 'mechanism',
        value: 'none',
        status: 'ABSENT',
        confidence: 0.95,
        raw: rawText,
      });
    } else if (
      rawText.includes('पडलो') ||
      rawText.includes('पडली') ||
      rawText.includes('पडला') ||
      rawText.includes('दुखापत') ||
      rawText.includes('चोट') ||
      rawText.includes('गिर गया') ||
      rawText.includes('fell') ||
      rawText.includes('fall') ||
      rawText.includes('injury') ||
      rawText.includes('trauma')
    ) {
      extractions.push({
        concept: 'symptom.injury',
        attribute: 'mechanism',
        value: 'fall_trauma',
        status: 'PRESENT',
        confidence: 0.94,
        raw: rawText,
      });
    }

    // 6. Multi-Clause Dyspnea, Sweating & Chest Pain Extraction (Section 5, Phase 6.6)
    const isDyspneaContext =
      expectedAttribute.includes('dyspnea') ||
      expectedConcept.includes('dyspnea') ||
      expectedConcept.includes('breath') ||
      activeContext.includes('dyspnea') ||
      activeContext.includes('breath') ||
      activeContext.includes('श्वास') ||
      activeContext.includes('सांस') ||
      activeContext.includes('धाप');

    const isSweatContext =
      expectedAttribute.includes('sweating') ||
      activeContext.includes('sweating') ||
      activeContext.includes('पसीना') ||
      activeContext.includes('घाम');

    let foundDyspnea = false;
    let foundSweating = false;

    for (const c of clauses) {
      const cText = c.text.toLowerCase().trim();
      if (!cText) continue;

      // --- A. Dyspnea in Clause ---
      const hasDyspneaMention =
        cText.includes('सांस') ||
        cText.includes('श्वास') ||
        cText.includes('धाप') ||
        cText.includes('breath') ||
        cText.includes('dyspnea');

      const isDyspneaNegInClause =
        cText.includes('सांस लेने में दिक्कत नहीं') ||
        cText.includes('सांस लेने में कोई दिक्कत नहीं') ||
        cText.includes('सांस लेने में तकलीफ नहीं') ||
        cText.includes('सांस लेने में कोई तकलीफ नहीं') ||
        cText.includes('सांस में कोई दिक्कत नहीं') ||
        cText.includes('सांस में कोई तकलीफ नहीं') ||
        cText.includes('सांस में दिक्कत नहीं') ||
        cText.includes('सांस में तकलीफ नहीं') ||
        cText.includes('सांस ठीक है') ||
        cText.includes('सांस ठीक') ||
        cText.includes('सांस सामान्य') ||
        cText.includes('श्वास घेण्यास त्रास नाही') ||
        cText.includes('श्वास ठीक आहे') ||
        cText.includes('श्वास ठीक') ||
        cText.includes('श्वास सामान्य') ||
        cText.includes('धाप लागत नाही') ||
        cText.includes('धाप नाही लागत') ||
        cText.includes('धाप येत नाही') ||
        cText.includes('धाप नाही येत') ||
        cText.includes('धाप नाही') ||
        cText.includes('no breathing difficulty') ||
        cText.includes('no shortness of breath') ||
        cText.includes('breathing is normal') ||
        (isDyspneaContext && (
          cText === 'नाही' ||
          cText === 'नाहीये' ||
          cText === 'नाही रे' ||
          cText === 'नहीं' ||
          cText === 'नहीं है' ||
          cText === 'नहीं रे' ||
          cText === 'no' ||
          cText === 'nope' ||
          cText.includes('तसा धाप वगैरे तर येत नाही') ||
          cText.includes('तसं काही नाही') ||
          cText.includes('काही नाही') ||
          (hasDyspneaMention && (cText.includes('नाही') || cText.includes('नहीं') || cText.includes('no') || cText.includes('not')))
        ));

      const isDyspneaPosInClause =
        !isDyspneaNegInClause &&
        (hasDyspneaMention ||
          (isDyspneaContext && (cText === 'हो' || cText === 'होय' || cText === 'हाँ' || cText === 'yes')));

      if (isDyspneaNegInClause && !foundDyspnea) {
        foundDyspnea = true;
        const conceptId = (expectedConcept && expectedConcept.includes('chest'))
          ? expectedConcept
          : (expectedAttribute === 'dyspnea' ? 'symptom.pain.chest' : 'symptom.dyspnea');
        const attrId = expectedAttribute === 'dyspnea' ? 'dyspnea' : 'presence';
        extractions.push({
          concept: conceptId,
          attribute: attrId,
          value: false,
          status: 'ABSENT',
          confidence: 0.96,
          raw: cText,
        });
      } else if (isDyspneaPosInClause && !foundDyspnea) {
        foundDyspnea = true;
        const conceptId = (expectedConcept && expectedConcept.includes('chest'))
          ? expectedConcept
          : (expectedAttribute === 'dyspnea' ? 'symptom.pain.chest' : 'symptom.dyspnea');
        const attrId = expectedAttribute === 'dyspnea' ? 'dyspnea' : 'presence';
        extractions.push({
          concept: conceptId,
          attribute: attrId,
          value: true,
          status: 'PRESENT',
          confidence: 0.98,
          raw: cText,
        });
      }

      // --- B. Sweating in Clause ---
      const hasSweatMention =
        cText.includes('पसीना') ||
        cText.includes('घाम') ||
        cText.includes('sweat') ||
        cText.includes('sweating') ||
        cText.includes('diaphoresis');

      const isSweatNegInClause =
        cText.includes('घाम येत नाही') ||
        cText.includes('घाम नाही येत') ||
        cText.includes('घाम नाही') ||
        cText.includes('घाम वगैरे नाही') ||
        cText.includes('पसीना नहीं आ रहा') ||
        cText.includes('पसीना नहीं') ||
        cText.includes('no sweat') ||
        cText.includes('no sweating') ||
        (isSweatContext && (
          cText === 'नाही' || cText === 'नहीं' || cText === 'no' ||
          (hasSweatMention && (cText.includes('नहीं') || cText.includes('नाही') || cText.includes('no') || cText.includes('not')))
        ));

      const isSweatPosInClause =
        !isSweatNegInClause &&
        (cText.includes('पसीना आ रहा') ||
          cText.includes('पसीना आ रहा है') ||
          cText.includes('पसीना') ||
          cText.includes('घाम येतोय') ||
          cText.includes('घाम येतो') ||
          cText.includes('घाम फुटतोय') ||
          cText.includes('घाम निघतोय') ||
          cText.includes('घाम वगैरे') ||
          cText.includes('घाम') ||
          cText.includes('cold sweat') ||
          cText.includes('sweating') ||
          cText.includes('sweat') ||
          (isSweatContext && (cText === 'हो' || cText === 'होय' || cText === 'हाँ' || cText === 'yes')));

      if (isSweatNegInClause && !foundSweating) {
        foundSweating = true;
        extractions.push({
          concept: 'symptom.pain.chest',
          attribute: 'sweating',
          value: false,
          status: 'ABSENT',
          confidence: 0.95,
          raw: cText,
        });
      } else if (isSweatPosInClause && !foundSweating) {
        foundSweating = true;
        extractions.push({
          concept: 'symptom.pain.chest',
          attribute: 'sweating',
          value: true,
          status: 'PRESENT',
          confidence: 0.95,
          raw: cText,
        });
      }

      // --- C. Chest Pain in Clause ---
      const hasChestMention =
        cText.includes('सीने में दर्द') ||
        cText.includes('सीने में') ||
        cText.includes('छातीत दुख') ||
        cText.includes('छातीत वेदना') ||
        cText.includes('छातीत कळ') ||
        cText.includes('छातीत काहीतरी') ||
        cText.includes('chest pain');

      if (hasChestMention) {
        const isChestNeg = cText.includes('नहीं') || cText.includes('नाही') || cText.includes('no');
        if (!extractions.some((e) => e.concept === 'symptom.pain.chest' && (e.attribute === 'presence' || e.attribute === 'complaint_type'))) {
          extractions.push({
            concept: 'symptom.pain.chest',
            attribute: 'presence',
            value: !isChestNeg,
            status: isChestNeg ? 'ABSENT' : 'PRESENT',
            confidence: 0.96,
            raw: cText,
          });
        }
      }
    }

    // 7. Swelling / Weight-Bearing Extraction with Negation (Section 7)
    const isSwellingContext =
      expectedAttribute.includes('swelling') ||
      activeContext.includes('swelling') ||
      activeContext.includes('सूजन') ||
      activeContext.includes('सूज');

    const isSwellingNegative =
      rawText.includes('सूजन नहीं') ||
      rawText.includes('सूज नाही') ||
      rawText.includes('no swelling') ||
      rawText.includes('not swollen') ||
      (isSwellingContext &&
        (rawText.includes('नाही') ||
          rawText.includes('नाहीये') ||
          rawText.includes('नहीं') ||
          rawText.includes('no') ||
          rawText.includes('बिल्कुल नहीं') ||
          rawText.includes('अजिबात नाही')));

    const isSwellingPositive =
      rawText.includes('सूज') ||
      rawText.includes('सुज') ||
      rawText.includes('सूजन') ||
      rawText.includes('swelling') ||
      rawText.includes('swollen') ||
      (isSwellingContext &&
        (rawText.includes('हो') ||
          rawText.includes('होय') ||
          rawText.includes('हाँ') ||
          rawText.includes('yes')));

    const alreadyHasSwelling = extractions.some((e) => e.attribute === 'swelling');
    if (!alreadyHasSwelling) {
      if (isSwellingNegative) {
        extractions.push({
          concept: 'symptom.injury',
          attribute: 'swelling',
          value: false,
          status: 'ABSENT',
          confidence: 0.96,
          raw: rawText,
        });
      } else if (isSwellingPositive) {
        extractions.push({
          concept: 'symptom.injury',
          attribute: 'swelling',
          value: true,
          status: 'PRESENT',
          confidence: 0.93,
          raw: rawText,
        });
      }
    }

    // 8. Food Relation / Trigger (PART H, Test 10)
    if (
      rawText.includes('जेवल्यावर') ||
      rawText.includes('जेवलं की') ||
      rawText.includes('जेवल्यानंतर') ||
      rawText.includes('खाल्ल्यानंतर') ||
      rawText.includes('खाल्ल्यावर') ||
      rawText.includes('जेवण') ||
      rawText.includes('खाना खाने के बाद') ||
      rawText.includes('खाना खाया कि') ||
      rawText.includes('खाने के बाद') ||
      rawText.includes('after eating') ||
      rawText.includes('after food') ||
      rawText.includes('food')
    ) {
      extractions.push({
        concept: 'symptom.pain.abdominal',
        attribute: 'foodRelation',
        value: 'after_eating',
        status: 'PRESENT',
        confidence: 0.92,
      });
    }

    // 9. Natural Duration Extraction (PART D, Tests 1, 2, 3, 10)
    let parsedDuration = null;
    let isVague = false;
    let rawVagueText = null;

    // A. Ranges: 6-7 days, 2-3 days, etc.
    if (
      rawText.includes('छह सात') ||
      rawText.includes('छे सात') ||
      rawText.includes('६-७') ||
      rawText.includes('६ ते ७') ||
      rawText.includes('सहा सात') ||
      rawText.includes('सहा-सात') ||
      rawText.includes('सहा ते सात') ||
      rawText.includes('6-7') ||
      rawText.includes('6 7') ||
      rawText.includes('6 to 7') ||
      rawText.includes('6/7') ||
      rawText.includes('six or seven') ||
      rawText.includes('six to seven') ||
      rawText.includes('six seven')
    ) {
      parsedDuration = { min: 6, max: 7, unit: 'days' };
    } else if (
      rawText.includes('चार पाच') ||
      rawText.includes('४-५') ||
      rawText.includes('four five') ||
      rawText.includes('4-5')
    ) {
      parsedDuration = { min: 4, max: 5, unit: 'days' };
    } else if (
      rawText.includes('दो तीन दिन') ||
      rawText.includes('दोन तीन दिवस') ||
      rawText.includes('2-3') ||
      rawText.includes('२-३') ||
      rawText.includes('two to three')
    ) {
      parsedDuration = { min: 2, max: 3, unit: 'days' };
    } else if (
      rawText.includes('तीन चार दिन') ||
      rawText.includes('तीन चार दिवस') ||
      rawText.includes('3-4') ||
      rawText.includes('३-४') ||
      rawText.includes('three to four') ||
      rawText.includes('three four')
    ) {
      parsedDuration = { min: 3, max: 4, unit: 'days' };
    // B. Approximate durations: about a week, two weeks, or 7 days (Test 2)
    } else if (
      rawText.includes('सात दिवस') ||
      rawText.includes('सात दिन') ||
      rawText.includes('7 दिन') ||
      rawText.includes('७ दिन') ||
      rawText.includes('७ दिवस') ||
      rawText.includes('seven days') ||
      rawText.includes('7 days')
    ) {
      parsedDuration = { min: 7, max: 7, unit: 'days' };
    } else if (
      rawText.includes('हफ्ते') ||
      rawText.includes('हफ्ता') ||
      rawText.includes('सप्ताह') ||
      rawText.includes('आठवडा') ||
      rawText.includes('आठवड') ||
      rawText.includes('week')
    ) {
      if (
        rawText.includes('दो हफ्ते') ||
        rawText.includes('2 हफ्ते') ||
        rawText.includes('दोन आठवडे') ||
        rawText.includes('two weeks') ||
        rawText.includes('2 weeks')
      ) {
        parsedDuration = { min: 14, max: 14, unit: 'days' };
      } else {
        parsedDuration = { min: 7, max: 7, unit: 'days' };
      }
    // C. Vague / Unspecified Duration (PART D, Test 3)
    } else if (
      rawText.includes('काही दिवस झाले') ||
      rawText.includes('काही दिवस') ||
      rawText.includes('काही दिवसांपासून') ||
      rawText.includes('बराच दिवस झाला') ||
      rawText.includes('गेले काही दिवस') ||
      rawText.includes('फार दिवसांपासून') ||
      rawText.includes('खूप दिवसांपासून') ||
      rawText.includes('काफी समय से') ||
      rawText.includes('बहुत दिनों से') ||
      rawText.includes('काफी दिनों से') ||
      rawText.includes('कई दिनों से') ||
      rawText.includes('कुछ दिनों से') ||
      rawText.includes('कुछ दिन हो गए') ||
      rawText.includes('been like this for some days') ||
      rawText.includes('quite some time') ||
      rawText.includes('for some time') ||
      rawText.includes('for a long time') ||
      rawText.includes('many days') ||
      rawText.includes('few days')
    ) {
      isVague = true;
      rawVagueText = rawText.includes('काही दिवस') ? 'काही दिवस झाले' : 'काफी समय से';
    // D. Specific numeric duration
    } else if (
      rawText.includes('चार दिवस') ||
      rawText.includes('चार दिन') ||
      rawText.includes('4 दिन') ||
      rawText.includes('४ दिन') ||
      rawText.includes('four days') ||
      rawText.includes('4 days') ||
      rawText.includes('४ दिवस')
    ) {
      parsedDuration = { value: 4, unit: 'days' };
    } else if (
      rawText.includes('तीन दिवस') ||
      rawText.includes('तीन दिन') ||
      rawText.includes('3 दिन') ||
      rawText.includes('३ दिन') ||
      rawText.includes('three days') ||
      rawText.includes('3 days') ||
      rawText.includes('३ दिवस')
    ) {
      parsedDuration = { value: 3, unit: 'days' };
    } else if (
      rawText.includes('दोन दिवस') ||
      rawText.includes('दो दिन') ||
      rawText.includes('2 दिन') ||
      rawText.includes('२ दिन') ||
      rawText.includes('two days') ||
      rawText.includes('2 days') ||
      rawText.includes('२ दिवस')
    ) {
      parsedDuration = { value: 2, unit: 'days' };
    } else if (
      rawText.includes('कालपासून') ||
      rawText.includes('कल से') ||
      rawText.includes('since yesterday') ||
      rawText.includes('yesterday') ||
      rawText.includes('आज से') ||
      rawText.includes('आजपासून') ||
      rawText.includes('today') ||
      rawText.includes('1 day') ||
      rawText.includes('1 दिन') ||
      rawText.includes('एक दिन') ||
      rawText.includes('एक दिवस')
    ) {
      parsedDuration = { value: 1, unit: 'days' };
    }

    if (parsedDuration || isVague) {
      let durationConcept = 'symptom.pain';
      if (
        rawText.includes('खांद') ||
        rawText.includes('कंध') ||
        rawText.includes('shoulder') ||
        expectedConcept.includes('shoulder')
      ) {
        durationConcept = 'symptom.pain.shoulder';
      } else if (
        rawText.includes('सांस') ||
        rawText.includes('श्वास') ||
        rawText.includes('breath') ||
        rawText.includes('dyspnea') ||
        expectedConcept.includes('dyspnea') ||
        expectedConcept.includes('breath')
      ) {
        durationConcept = 'symptom.dyspnea';
      } else if (rawText.includes('उलटी') || rawText.includes('उल्टी') || rawText.includes('vomit') || expectedConcept.includes('vomit')) {
        durationConcept = 'symptom.vomiting';
      } else if (rawText.includes('जुलाब') || rawText.includes('दस्त') || rawText.includes('diarrhea') || expectedConcept.includes('diarrhea')) {
        durationConcept = 'symptom.diarrhea';
      } else if (rawText.includes('ताप') || rawText.includes('बुखार') || rawText.includes('fever') || expectedConcept.includes('fever')) {
        durationConcept = 'symptom.fever';
      } else if (rawText.includes('गुडघ') || rawText.includes('घुटन') || rawText.includes('knee') || expectedConcept.includes('knee')) {
        durationConcept = 'symptom.pain.knee';
      } else if (rawText.includes('छाती') || rawText.includes('सीने') || rawText.includes('chest') || expectedConcept.includes('chest')) {
        durationConcept = 'symptom.pain.chest';
      } else if (rawText.includes('पोट') || rawText.includes('पेट') || rawText.includes('stomach') || expectedConcept.includes('stomach') || expectedConcept.includes('abdominal')) {
        durationConcept = 'symptom.pain.abdominal';
      }

      if (isVague) {
        extractions.push({
          concept: durationConcept,
          attribute: 'duration',
          value: null,
          raw: rawVagueText,
          precision: 'vague',
          status: 'PRESENT',
          confidence: 0.88,
        });
      } else if (parsedDuration) {
        extractions.push({
          concept: durationConcept,
          attribute: 'duration',
          value: parsedDuration.value !== undefined ? parsedDuration.value : parsedDuration,
          unit: 'days',
          status: 'PRESENT',
          confidence: 0.95,
        });
      }
    }

    // 10. Natural Severity Extraction with Negation & Contrast (Section 2. SEVERITY)
    const hasNegatedSeverity =
      rawText.includes('बहुत ज्यादा नहीं') ||
      rawText.includes('ज्यादा नहीं') ||
      rawText.includes('काफी ज्यादा नहीं') ||
      rawText.includes('तेज नहीं') ||
      rawText.includes('तीव्र नाही') ||
      rawText.includes('जास्त नाही') ||
      rawText.includes('खूप जास्त नाही') ||
      rawText.includes('फार जास्त नाही') ||
      rawText.includes('खूप नाही') ||
      rawText.includes('फार नाही') ||
      rawText.includes('एवढं काही जास्त नाही') ||
      rawText.includes('zyada nahi') ||
      rawText.includes('zyada nhi') ||
      rawText.includes('bahut zyada nahi') ||
      rawText.includes('bahut zyada nhi') ||
      rawText.includes('not severe') ||
      rawText.includes('not too severe') ||
      rawText.includes('not very bad') ||
      rawText.includes('not too much') ||
      rawText.includes('not very high');

    // Balanced / middle-ground colloquial expressions
    const hasBalancedSeverity =
      rawText.includes('ना कमी ना जास्त') ||
      rawText.includes('न कम न ज्यादा') ||
      rawText.includes('ना कम ना ज्यादा') ||
      rawText.includes('neither less nor more') ||
      rawText.includes('कमी नाही, मध्यम आहे') ||
      rawText.includes('कमी नाही पण मध्यम') ||
      rawText.includes('कम नहीं, मध्यम है') ||
      rawText.includes('कम नहीं लेकिन मध्यम');

    // Contrast with tolerability (e.g. "बराच त्रास आहे पण सहन होतोय", "जास्त आहे पण सहन होतंय")
    const hasTolerableContrast =
      (rawText.includes('सहन') || rawText.includes('सहने')) &&
      !rawText.includes('सहन होत नाही') &&
      !rawText.includes('सहन नहीं') &&
      (rawText.includes('त्रास') || rawText.includes('जास्त') || rawText.includes('काफी') || rawText.includes('तकलीफ') || rawText.includes('pain'));

    let severityVal = null;
    let severityConf = 0.92;

    if (
      rawText.includes('असहनीय') ||
      rawText.includes('असह्य') ||
      rawText.includes('सहन होत नाही') ||
      rawText.includes('सहन नहीं हो रहा') ||
      rawText.includes('सहन नहीं') ||
      rawText.includes('मेल्यासारखं') ||
      rawText.includes('unbearable')
    ) {
      severityVal = 'UNBEARABLE';
      severityConf = 0.98;
    } else if (hasBalancedSeverity || hasTolerableContrast) {
      // "ना कमी ना जास्त", "बराच त्रास आहे पण सहन होतोय", "जास्त आहे पण सहन होतंय"
      severityVal = 'MODERATE';
      severityConf = 0.95;
    } else if (
      (rawText.includes('तीव्र') ||
        rawText.includes('बहुत ज्यादा') ||
        rawText.includes('खूप जास्त') ||
        rawText.includes('फार जास्त') ||
        rawText.includes('खूप त्रास') ||
        rawText.includes('फारच त्रास') ||
        rawText.includes('खूपच जास्त') ||
        rawText.includes('बहुत तेज') ||
        rawText.includes('काफी तेज') ||
        rawText.includes('जास्त आहे') ||
        rawText.includes('ज्यादा है') ||
        rawText.includes('bahut zyada') ||
        rawText.includes('extreme') ||
        rawText.includes('severe')) &&
      !hasNegatedSeverity
    ) {
      severityVal = 'SEVERE';
      severityConf = 0.96;
    } else if (
      rawText.includes('moderate') ||
      rawText.includes('मध्यम') ||
      rawText.includes('medium') ||
      rawText.includes('manageable') ||
      rawText.includes('not too bad') ||
      rawText.includes('ठीक-ठाक') ||
      rawText.includes('ठीकठाक') ||
      rawText.includes('बीच का') ||
      rawText.includes('साधारण') ||
      rawText.includes('बराच आहे') ||
      rawText.includes('बरंच आहे') ||
      rawText.includes('बराच त्रास') ||
      rawText.includes('बरंच') ||
      rawText.includes('कधी कमी कधी जास्त') ||
      rawText.includes('जास्त नाही पण') ||
      rawText.includes('zyada nahi but') ||
      rawText.includes('not too much but') ||
      rawText.includes('काफी दिन से') ||
      (hasNegatedSeverity && (rawText.includes('moderate') || rawText.includes('मध्यम') || rawText.includes('ठीक') || rawText.includes('साधारण') || rawText.includes('बराच') || rawText.includes('medium') || rawText.includes('pain') || rawText.includes('त्रास'))) ||
      rawText.includes('फार जास्त नाही') ||
      rawText.includes('बहुत ज्यादा नहीं')
    ) {
      severityVal = 'MODERATE';
      severityConf = 0.94;
    } else if (
      rawText.includes('हल्का') ||
      rawText.includes('थोड़ा') ||
      rawText.includes('थोडा') ||
      rawText.includes('कमी') ||
      rawText.includes('थोडे') ||
      rawText.includes('थोडी') ||
      rawText.includes('थोडं दुखतंय') ||
      rawText.includes('थोडंफार') ||
      rawText.includes('थोडं') ||
      rawText.includes('जरा दुखतंय') ||
      rawText.includes('जरा') ||
      rawText.includes('फार नाही') ||
      rawText.includes('सहन होतंय') ||
      rawText.includes('mild') ||
      rawText.includes('slight') ||
      rawText.includes('thoda') ||
      (hasNegatedSeverity && !rawText.includes('moderate') && !rawText.includes('मध्यम') && !rawText.includes('बराच'))
    ) {
      severityVal = 'MILD';
      severityConf = 0.92;
    }

    if (severityVal) {
      let sevConcept = 'symptom.pain';
      if (
        rawText.includes('खांद') ||
        rawText.includes('कंध') ||
        rawText.includes('shoulder') ||
        expectedConcept.includes('shoulder')
      ) {
        sevConcept = 'symptom.pain.shoulder';
      } else if (
        rawText.includes('सांस') ||
        rawText.includes('श्वास') ||
        rawText.includes('breath') ||
        expectedConcept.includes('dyspnea') ||
        expectedConcept.includes('breath')
      ) {
        sevConcept = 'symptom.dyspnea';
      } else if (rawText.includes('गुडघ') || rawText.includes('घुटन') || rawText.includes('knee') || expectedConcept.includes('knee')) {
        sevConcept = 'symptom.pain.knee';
      } else if (rawText.includes('छाती') || rawText.includes('सीने') || rawText.includes('chest') || expectedConcept.includes('chest')) {
        sevConcept = 'symptom.pain.chest';
      } else if (rawText.includes('पोट') || rawText.includes('पेट') || rawText.includes('stomach') || expectedConcept.includes('stomach') || expectedConcept.includes('abdominal')) {
        sevConcept = 'symptom.pain.abdominal';
      } else if (expectedConcept && expectedConcept.startsWith('symptom.')) {
        sevConcept = expectedConcept;
      }

      extractions.push({
        concept: sevConcept,
        attribute: 'severity',
        value: severityVal,
        status: 'PRESENT',
        confidence: severityConf,
      });
    }

    // 11. Multi-Symptom Extractions (e.g. cough along with fever)
    if ((rawText.includes('खोकला') || rawText.includes('खांसी') || rawText.includes('cough')) && !rawText.includes('no cough')) {
      extractions.push({
        concept: 'symptom.cough',
        attribute: 'presence',
        value: true,
        status: 'PRESENT',
        confidence: 0.93,
      });
    }

    // 12. Vomiting & Abdominal Extractions (PART G & Test 8)
    if (
      !isVomitNegative &&
      (rawText.includes('उलटी') ||
        rawText.includes('उल्टी') ||
        rawText.includes('vomit') ||
        rawText.includes('nausea') ||
        rawText.includes('मळमळ') ||
        ((activeContext.includes('vomit') || expectedConcept.includes('vomit')) &&
          (rawText.includes('हो') || rawText.includes('सकाळपासून') || rawText.includes('कल से') || rawText.includes('yes') || rawText.includes('हाँ'))))
    ) {
      const extObj = {
        concept: 'symptom.vomiting',
        attribute: 'presence',
        value: true,
        status: 'PRESENT',
        confidence: 0.98,
      };
      if (rawText.includes('सकाळपासून') || rawText.includes('morning')) {
        extObj.onset = 'morning';
      }
      extractions.push(extObj);
    }

    // Fallback if no specific slots extracted but patient said general pain:
    if (extractions.length === 0 && (rawText.includes('pain') || rawText.includes('दुख') || rawText.includes('दर्द'))) {
      extractions.push({
        concept: 'symptom.pain',
        attribute: 'complaint_type',
        value: 'pain',
        status: 'PRESENT',
        confidence: 0.85,
      });
    }

    // 13. Active Question Direct Negation / Affirmation Fallback
    const isPureNegative =
      rawText === 'नाही' ||
      rawText === 'नाहीये' ||
      rawText === 'नाही तसं' ||
      rawText === 'तसं काही नाही' ||
      rawText === 'काही नाही' ||
      rawText === 'अजिबात नाही' ||
      rawText === 'नाही अजिबात' ||
      rawText === 'नाही, अजिबात नाही' ||
      rawText === 'नहीं' ||
      rawText === 'नहीं है' ||
      rawText === 'ऐसा कुछ नहीं' ||
      rawText === 'बिल्कुल नहीं' ||
      rawText === 'नहीं, बिल्कुल नहीं' ||
      rawText === 'no' ||
      rawText === 'nope' ||
      rawText === 'none' ||
      rawText === 'not';

    const isPureAffirmative =
      rawText === 'हो' ||
      rawText === 'होय' ||
      rawText === 'हाँ' ||
      rawText === 'yes' ||
      rawText === 'yeah' ||
      rawText === 'haan';

    if (extractions.length === 0) {
      if (isPureNegative && (expectedConcept || expectedAttribute)) {
        extractions.push({
          concept: expectedConcept || 'symptom.general',
          attribute: expectedAttribute || 'presence',
          value: false,
          status: 'ABSENT',
          confidence: 0.95,
          raw: rawText,
        });
      } else if (isPureAffirmative && (expectedConcept || expectedAttribute)) {
        extractions.push({
          concept: expectedConcept || 'symptom.general',
          attribute: expectedAttribute || 'presence',
          value: true,
          status: 'PRESENT',
          confidence: 0.95,
          raw: rawText,
        });
      }
    }

    // 14. Determine if patient response directly answers the active question
    let answersCurrentQuestion = true;
    if (expectedConcept || expectedAttribute || activeContext) {
      const isTargetMatch = (ext) => {
        if (expectedAttribute && ext.attribute === expectedAttribute) return true;
        if (expectedConcept && ext.concept === expectedConcept && ext.attribute === expectedAttribute) return true;

        // Dyspnea / breathing equivalence
        if (
          (expectedAttribute === 'dyspnea' || expectedConcept.includes('dyspnea') || activeContext.includes('dyspnea') || activeContext.includes('सांस') || activeContext.includes('श्वास') || activeContext.includes('धाप')) &&
          (ext.attribute === 'dyspnea' || ext.concept === 'symptom.dyspnea' || ext.concept === 'symptom.breathing')
        ) {
          return true;
        }

        // Sweating equivalence
        if (
          (expectedAttribute === 'sweating' || activeContext.includes('sweating') || activeContext.includes('पसीना') || activeContext.includes('घाम')) &&
          (ext.attribute === 'sweating' || ext.concept === 'symptom.sweating')
        ) {
          return true;
        }

        // Radiation equivalence
        if (
          (expectedAttribute === 'radiation' || activeContext.includes('radiation') || activeContext.includes('पसर')) &&
          ext.attribute === 'radiation'
        ) {
          return true;
        }

        // Mechanism / injury equivalence
        if (
          (expectedAttribute === 'mechanism' || expectedConcept.includes('injury') || activeContext.includes('दुखापत') || activeContext.includes('पडलो') || activeContext.includes('fell') || activeContext.includes('चोट')) &&
          (ext.attribute === 'mechanism' || ext.concept === 'symptom.injury')
        ) {
          return true;
        }

        // Swelling equivalence
        if (
          (expectedAttribute === 'swelling' || activeContext.includes('swelling') || activeContext.includes('सूज') || activeContext.includes('सूजन')) &&
          ext.attribute === 'swelling'
        ) {
          return true;
        }

        // Duration equivalence
        if (
          (expectedAttribute === 'duration' || activeContext.includes('duration') || activeContext.includes('किती दिवस') || activeContext.includes('कितने दिन')) &&
          ext.attribute === 'duration'
        ) {
          return true;
        }

        // Severity equivalence
        if (
          (expectedAttribute === 'severity' || activeContext.includes('severity') || activeContext.includes('तीव्रता')) &&
          ext.attribute === 'severity'
        ) {
          return true;
        }

        if (expectedConcept && ext.concept === expectedConcept) return true;
        return false;
      };

      const hasDirectTargetMatch = extractions.some(isTargetMatch);

      if (!hasDirectTargetMatch && extractions.length > 0) {
        answersCurrentQuestion = false;
      }
    }

    const payload = {
      extractions,
      answersCurrentQuestion,
    };
    return {
      success: true,
      rawOutput: JSON.stringify(payload),
      latency: Date.now() - startTime,
    };
  },

  /**
   * Dynamic Question Generation for testing & zero-GPU environments (Section 27-33)
   * Dynamically reasons over clinical state to generate clinical-intake questions.
   */
  async generateDynamicQuestion(systemPrompt, userPrompt) {
    const startTime = Date.now();
    const promptLower = userPrompt.toLowerCase();
    const isHindi = promptLower.includes('language: hi') || promptLower.includes('"language": "hi"') || promptLower.includes('hindi');
    const isEnglish = promptLower.includes('language: en') || promptLower.includes('"language": "en"') || promptLower.includes('english');

    let candidate = null;

    // Check if shoulder presentation
    if (
      promptLower.includes('shoulder') ||
      promptLower.includes('खांद') ||
      promptLower.includes('कंध')
    ) {
      if (
        promptLower.includes('fall') ||
        promptLower.includes('injury') ||
        promptLower.includes('दुखापत') ||
        promptLower.includes('पडलो') ||
        promptLower.includes('चोट')
      ) {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या हाथ उठाने या हिलाने पर कंधे का दर्द बहुत बढ़ जाता है?'
            : isEnglish
            ? 'Does raising or moving your arm worsen the shoulder pain?'
            : 'हात वर करताना किंवा खांदा हलवताना दुखणं वाढतं का?',
          targetConcept: 'symptom.pain.shoulder',
          targetAttribute: 'movementAggravation',
          priority: 'high',
          options: isHindi
            ? ['हां, हाथ हिलाने पर बढ़ता है', 'नहीं, एक जैसा रहता है', 'पता नहीं']
            : isEnglish
            ? ['Yes, worse with movement', 'No, constant pain', 'Not sure']
            : ['हो, हालचाल करताना वाढते', 'नाही, सारखेच राहते', 'माहित नाही'],
          reason: 'Evaluate dynamic mechanical aggravation, impingement, and range-of-motion limitations post-injury.',
        };
      } else {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या यह परेशानी किसी चोट लगने या गिरने के बाद शुरू हुई थी?'
            : isEnglish
            ? 'Did this trouble start after an injury, strain, or fall?'
            : 'हा त्रास काही दुखापत झाल्यानंतर सुरू झाला का?',
          targetConcept: 'symptom.pain.shoulder',
          targetAttribute: 'injury',
          priority: 'high',
          options: isHindi
            ? ['हां, चोट लगी / गिर गया था', 'नहीं, अपने आप शुरू हुआ', 'पता नहीं']
            : isEnglish
            ? ['Yes, had injury/fall', 'No, started spontaneously', 'Not sure']
            : ['हो, पडलो / दुखापत झाली', 'नाही, अचानक सुरू झाले', 'माहित नाही'],
          reason: 'Differentiate acute traumatic shoulder pathology from spontaneous arthritic or capsular issues.',
        };
      }
    } else if (promptLower.includes('knee') || promptLower.includes('गुडघ') || promptLower.includes('घुटन')) {
      if (promptLower.includes('swelling') || promptLower.includes('सूज') || promptLower.includes('सूजन')) {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या आप पैर को पूरी तरह सीधा या मोड़ सकते हैं, या घुटना अटकता है?'
            : isEnglish
            ? 'Can you fully straighten or bend your knee, or does it feel locked?'
            : 'तुम्हाला पाय पूर्णपणे सरळ किंवा वाकवता येतो का, की गुडघा अडकल्यासारखा वाटतो?',
          targetConcept: 'symptom.joint',
          targetAttribute: 'rangeOfMotion',
          priority: 'high',
          options: isHindi
            ? ['मोड़ने में असमर्थ', 'मुड़ता है पर दर्द है', 'सामान्य']
            : isEnglish
            ? ['Cannot bend/straighten', 'Bends with pain', 'Normal movement']
            : ['वाकवता येत नाही', 'वाकवता येतो पण दुखते', 'काही अडचण नाही'],
          reason: 'Evaluate mechanical symptoms, range of motion, and joint locking post-swelling.',
        };
      } else if (
        promptLower.includes('fall_trauma') ||
        promptLower.includes('काल पडलो') ||
        promptLower.includes('injury') ||
        promptLower.includes('दुखापत') ||
        promptLower.includes('चोट') ||
        promptLower.includes('पडलो होतो')
      ) {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या घुटने पर सूजन आ गई है या चलने में बहुत परेशानी हो रही है?'
            : isEnglish
            ? 'Is there swelling on the knee or severe difficulty bearing weight/walking?'
            : 'गुडघ्यावर सूज आली आहे का किंवा चालताना खूप त्रास होतोय का?',
          targetConcept: 'symptom.injury',
          targetAttribute: 'swelling',
          priority: 'high',
          options: isHindi
            ? ['हां, बहुत सूजन है', 'सिर्फ चलने में दर्द', 'नहीं']
            : isEnglish
            ? ['Yes, severe swelling', 'Pain only while walking', 'No']
            : ['हो, खूप सूज आली आहे', 'फक्त चालताना दुखते', 'नाही'],
          reason: 'Trauma confirmed; evaluate joint effusion, swelling, and weight-bearing ability.',
        };
      } else {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या इस दर्द से पहले घुटने में कोई चोट लगी थी या आप गिरे थे?'
            : isEnglish
            ? 'Did you have an injury or fall before this knee pain started?'
            : 'हा त्रास होण्याआधी तुमच्या गुडघ्याला काही दुखापत झाली होती का किंवा तुम्ही पडला होता का?',
          targetConcept: 'symptom.injury',
          targetAttribute: 'mechanism',
          priority: 'high',
          options: isHindi
            ? ['हां, गिर गया था / चोट लगी', 'नहीं, अचानक शुरू हुआ', 'पता नहीं']
            : isEnglish
            ? ['Yes, had a fall/injury', 'No, started spontaneously', 'Not sure']
            : ['हो, पडलो होतो / दुखापत झाली', 'नाही, अचानक सुरू झाले', 'माहित नाही'],
          reason: 'Differentiate traumatic knee injury from non-traumatic arthropathy.',
        };
      }
    } else if (promptLower.includes('chest') || promptLower.includes('छाती') || promptLower.includes('सीना')) {
      // Chest presentation
      if (promptLower.includes('dyspnea') || promptLower.includes('श्वास') || promptLower.includes('सांस')) {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या यह दर्द चलने या मेहनत करने पर बढ़ जाता है?'
            : isEnglish
            ? 'Does this chest pain worsen with exertion or walking?'
            : 'हे दुखणे चालताना किंवा श्रम केल्यावर जास्त वाढते का?',
          targetConcept: 'symptom.pain.chest',
          targetAttribute: 'exertionTrigger',
          priority: 'high',
          options: isHindi
            ? ['हां, चलने पर बढ़ता है', 'नहीं, स्थिर रहता है', 'पता नहीं']
            : isEnglish
            ? ['Yes, worsens with exertion', 'No, constant', 'Not sure']
            : ['हो, चालल्यावर वाढते', 'नाही, सारखेच राहते', 'माहित नाही'],
          reason: 'Assess exertional angina differential.',
        };
      } else if (promptLower.includes('radiation') || promptLower.includes('पसरते') || promptLower.includes('फैलता')) {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या आपको सांस लेने में तकलीफ या पसीना आ रहा है?'
            : isEnglish
            ? 'Are you experiencing shortness of breath or cold sweats?'
            : 'तुम्हाला श्वास घेण्यास त्रास किंवा घाम येतोय का?',
          targetConcept: 'symptom.pain.chest',
          targetAttribute: 'dyspnea',
          priority: 'high',
          options: isHindi
            ? ['हां, सांस फूल रही है', 'नहीं', 'पता नहीं']
            : isEnglish
            ? ['Yes, breathless', 'No', 'Not sure']
            : ['हो, त्रास होतोय', 'नाही', 'माहित नाही'],
          reason: 'Evaluate associated autonomic or dyspneic features in chest pain presentation.',
        };
      } else {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या यह दर्द हाथ, जबड़े या पीठ की तरफ फैलता है?'
            : isEnglish
            ? 'Does this pain radiate to your left arm, jaw, or back?'
            : 'हे दुखणे हात, जबडा किंवा पाठीकडे पसरते का?',
          targetConcept: 'symptom.pain.chest',
          targetAttribute: 'radiation',
          priority: 'high',
          options: isHindi
            ? ['हां, फैलता है', 'नहीं, सिर्फ सीने में है', 'पता नहीं']
            : isEnglish
            ? ['Yes, spreads', 'No, only in chest', 'Not sure']
            : ['हो, पसरते', 'नाही, फक्त छातीत आहे', 'माहित नाही'],
          reason: 'Evaluate radiation site for acute coronary syndrome differential.',
        };
      }
    } else if (promptLower.includes('stomach') || promptLower.includes('पोट') || promptLower.includes('पेट') || promptLower.includes('abdominal') || promptLower.includes('vomit') || promptLower.includes('उलटी')) {
      // Abdominal pain presentation
      if (promptLower.includes('associatedsymptoms') || promptLower.includes('उलटी') || promptLower.includes('मळमळ')) {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'पेट में ठीक कहां दर्द हो रहा है - ऊपरी हिस्से में या नाभि के आसपास?'
            : isEnglish
            ? 'Where in the abdomen is the pain focused - upper part or around the navel?'
            : 'पोटात नेमके कुठे दुखत आहे - वरच्या भागात की बेंबीभोवती?',
          targetConcept: 'symptom.pain.abdominal',
          targetAttribute: 'quadrant',
          priority: 'high',
          options: isHindi
            ? ['ऊपरी पेट (छाती के नीचे)', 'नाभि के पास', 'निचले पेट में']
            : isEnglish
            ? ['Upper abdomen (epigastric)', 'Around navel', 'Lower abdomen']
            : ['वरच्या भागात (छातीखाली)', 'बेंबीभोवती', 'खालच्या भागात'],
          reason: 'Localize anatomical quadrant for visceral differential.',
        };
      } else if (promptLower.includes('foodrelation') || promptLower.includes('जेवण') || promptLower.includes('खाल्ल्यानंतर')) {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या उल्टी, मतली या दस्त जैसी कोई तकलीफ हो रही है?'
            : isEnglish
            ? 'Are you experiencing vomiting, nausea, or loose motions?'
            : 'उलटी, मळमळ किंवा जुलाब असा काही त्रास होत आहे का?',
          targetConcept: 'symptom.pain.abdominal',
          targetAttribute: 'associatedSymptoms',
          priority: 'high',
          options: isHindi
            ? ['हां, उल्टी/मतली है', 'नहीं', 'पता नहीं']
            : isEnglish
            ? ['Yes, nausea/vomiting', 'No', 'Not sure']
            : ['हो, उलटी/मळमळ होतेय', 'नाही', 'माहित नाही'],
          reason: 'Check for acute gastroenteritis, biliary, or intestinal symptoms.',
        };
      } else {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'क्या यह दर्द खाना खाने के बाद या किसी खास चीज से बढ़ता है?'
            : isEnglish
            ? 'Does this pain worsen after meals or specific food intake?'
            : 'हे दुखणे जेवण केल्यानंतर किंवा विशिष्ट पदार्थ खाल्ल्यानंतर वाढते का?',
          targetConcept: 'symptom.pain.abdominal',
          targetAttribute: 'foodRelation',
          priority: 'high',
          options: isHindi
            ? ['हां, खाने के बाद बढ़ता है', 'नहीं, खाने से संबंध नहीं', 'पता नहीं']
            : isEnglish
            ? ['Yes, worse after eating', 'No, unrelated to food', 'Not sure']
            : ['हो, जेवल्यावर वाढते', 'नाही, जेवणाशी संबंध नाही', 'माहित नाही'],
          reason: 'Differentiate peptic ulcer, dyspepsia, or gall bladder involvement from generalized pain.',
        };
      }
    } else if (promptLower.includes('diarrhea') || promptLower.includes('जुलाब') || promptLower.includes('दस्त')) {
      // Diarrhea presentation
      if (promptLower.includes('duration') || promptLower.includes('चार दिवस')) {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'दिन में कितनी बार दस्त हो रहे हैं और क्या खून दिखाई दे रहा है?'
            : isEnglish
            ? 'How many loose stools per day, and is there any blood visible?'
            : 'दिवसातून साधारण किती वेळा जुलाब होत आहेत आणि संडासमध्ये रक्त दिसते का?',
          targetConcept: 'symptom.diarrhea',
          targetAttribute: 'frequency',
          priority: 'high',
          options: isHindi
            ? ['३-४ बार', '५ से ज्यादा बार', 'खून दिखता है', 'खून नहीं है']
            : isEnglish
            ? ['3-4 times', '> 5 times', 'Blood visible', 'No blood']
            : ['३-४ वेळा', '५ पेक्षा जास्त वेळा', 'रक्त दिसते', 'रक्त दिसत नाही'],
          reason: 'Assess hydration risk, frequency, and dysentery signs.',
        };
      } else {
        candidate = {
          shouldAskQuestion: true,
          questionText: isHindi
            ? 'यह दस्त की समस्या कब से शुरू हुई है?'
            : isEnglish
            ? 'How long have you had loose motions / diarrhea?'
            : 'हा जुलाबाचा त्रास तुम्हाला कधीपासून सुरू झाला आहे?',
          targetConcept: 'symptom.diarrhea',
          targetAttribute: 'duration',
          priority: 'high',
          options: isHindi
            ? ['आज से', 'कल से', '२-३ दिनों से', '४ दिन से ज्यादा']
            : isEnglish
            ? ['Today', 'Yesterday', '2-3 days', '> 4 days']
            : ['आजपासून', 'कालपासून', '२-३ दिवसांपासून', '४ दिवसांपेक्षा जास्त'],
          reason: 'Determine acute versus persistent diarrheal illness.',
        };
      }
    } else {
      candidate = {
        shouldAskQuestion: true,
        questionText: isHindi
          ? 'आपके दर्द या परेशानी की तीव्रता कितनी है?'
          : isEnglish
          ? 'How severe is your discomfort or pain?'
          : 'तुमच्या त्रासाचे स्वरूप कसे आहे आणि वेदना किती तीव्र आहे?',
        targetConcept: 'symptom.pain',
        targetAttribute: 'severity',
        priority: 'medium',
        options: isHindi
          ? ['कम', 'मध्यम', 'बहुत तेज']
          : isEnglish
          ? ['Mild', 'Moderate', 'Severe']
          : ['कमी', 'मध्यम', 'खूप जास्त'],
        reason: 'General symptom severity exploration.',
      };
    }

    return {
      success: true,
      rawOutput: JSON.stringify(candidate),
      latency: Date.now() - startTime,
    };
  },
};

