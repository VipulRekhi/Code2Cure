/**
 * High-Fidelity Mock Extraction Provider (Section 31 & 32)
 * Deterministic multi-slot clinical extraction for development, testing, and zero-GPU environments.
 */

export const mockProvider = {
  name: 'mock-clinical-extractor',

  async generateStructuredExtraction(systemPrompt, userPrompt) {
    const startTime = Date.now();
    const inputMatch = userPrompt.match(/<PATIENT_INPUT>([\s\S]*?)<\/PATIENT_INPUT>/i);
    const rawText = (inputMatch ? inputMatch[1] : userPrompt).toLowerCase().trim();

    const ctxMatch = userPrompt.match(/ACTIVE QUESTION CONTEXT:([\s\S]*?)<PATIENT_INPUT>/i);
    const activeContext = ctxMatch ? ctxMatch[1].toLowerCase() : '';
    const expConceptMatch = activeContext.match(/expected concept:\s*"([^"]+)"/i);
    const expAttrMatch = activeContext.match(/expected attribute:\s*"([^"]+)"/i);
    const expectedConcept = expConceptMatch ? expConceptMatch[1].toLowerCase() : '';
    const expectedAttribute = expAttrMatch ? expAttrMatch[1].toLowerCase() : '';

    const extractions = [];

    // 1. Unknown / Uncertainty Check (Section 18, 19)
    if (
      rawText.includes('माहित नाही') ||
      rawText.includes('नक्की माहित नाही') ||
      rawText.includes('मला माहित नाही') ||
      rawText.includes('पता नहीं') ||
      rawText.includes('मुझे पता नहीं') ||
      rawText.includes('मुझे नहीं पता') ||
      rawText.includes('कभी कम कभी ज्यादा') ||
      rawText.includes("don't know") ||
      rawText.includes('not sure') ||
      rawText.includes("i'm not sure") ||
      rawText.includes('maybe') ||
      rawText.includes('unknown')
    ) {
      let targetConcept = 'symptom.pain';
      let targetAttr = 'location';
      if (expectedAttribute.includes('severity')) targetAttr = 'severity';
      else if (expectedAttribute.includes('duration')) targetAttr = 'duration';
      else if (expectedAttribute.includes('swelling')) targetAttr = 'swelling';
      else if (expectedAttribute.includes('radiation')) targetAttr = 'radiation';

      if (expectedConcept.includes('dyspnea') || expectedConcept.includes('breath') || rawText.includes('सांस')) {
        targetConcept = 'symptom.dyspnea';
      } else if (expectedConcept.includes('knee')) {
        targetConcept = 'symptom.pain.knee';
      } else if (expectedConcept.includes('chest')) {
        targetConcept = 'symptom.pain.chest';
      }

      extractions.push({
        concept: targetConcept,
        attribute: targetAttr,
        value: targetAttr === 'radiation' ? 'unknown' : null,
        status: 'UNKNOWN',
        confidence: null,
        raw: rawText,
      });

      return {
        success: true,
        rawOutput: JSON.stringify({ extractions }),
        latency: Date.now() - startTime,
      };
    }

    // 2. Negative Statement Checks (Section 18) & Positive Fever Extraction
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

    if (
      rawText.includes('उलटी नाही') ||
      rawText.includes('उल्टी नहीं') ||
      rawText.includes('no vomit') ||
      (rawText.includes('नाहीये') && activeContext.includes('vomit'))
    ) {
      extractions.push({
        concept: 'symptom.vomiting',
        attribute: 'presence',
        value: false,
        status: 'ABSENT',
        confidence: 0.95,
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

    // 4. Location Extraction
    if (rawText.includes('छाती') || rawText.includes('सीने') || rawText.includes('सीना') || rawText.includes('chest')) {
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
        rawText.includes('नाही') ||
        rawText.includes('नहीं') ||
        rawText.includes('फक्त छातीत') ||
        rawText.includes('छातीतच') ||
        rawText.includes('सिर्फ छाती') ||
        rawText.includes('सिर्फ सीने') ||
        rawText.includes('केवल सीने') ||
        rawText.includes('कहीं नहीं') ||
        rawText.includes('कुठेही नाही') ||
        rawText.includes('कुठेही पसरत नाही');

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

      if (isNegative && !rawText.includes('yes') && !rawText.includes('होय') && !rawText.includes('हाँ') && !rawText.includes('spread')) {
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
        if (rawText.includes('arm') || rawText.includes('हाता') || rawText.includes('हाथ') || rawText.includes('shoulder')) {
          val = 'LEFT_ARM';
        } else if (rawText.includes('jaw') || rawText.includes('neck') || rawText.includes('जबड़') || rawText.includes('माने') || rawText.includes('हनुवटी')) {
          val = 'JAW_NECK';
        } else if (rawText.includes('back') || rawText.includes('पीठ') || rawText.includes('पाठी')) {
          val = 'BACK';
        }

        const extObj = {
          concept: expectedConcept || 'symptom.pain.chest',
          attribute: 'radiation',
          value: val,
          status: 'PRESENT',
          confidence: 0.95,
          raw: rawText,
        };

        if (rawText.includes('sometimes') || rawText.includes('कधी कधी') || rawText.includes('कभी कभी')) {
          extObj.radiationFrequency = 'sometimes';
        }
        if (rawText.includes('little') || rawText.includes('थोड़ा') || rawText.includes('थोडं') || rawText.includes('mild')) {
          extObj.radiationExtent = 'mild';
        }

        extractions.push(extObj);
      }
    } else if (
      rawText.includes('spread') ||
      rawText.includes('spreads') ||
      rawText.includes('पसर') ||
      rawText.includes('फैलता')
    ) {
      let val = true;
      if (rawText.includes('arm') || rawText.includes('हाता') || rawText.includes('हाथ')) val = 'LEFT_ARM';
      else if (rawText.includes('jaw') || rawText.includes('जबड़')) val = 'JAW_NECK';
      else if (rawText.includes('back') || rawText.includes('पीठ') || rawText.includes('पाठी')) val = 'BACK';

      extractions.push({
        concept: 'symptom.pain.chest',
        attribute: 'radiation',
        value: val,
        status: 'PRESENT',
        confidence: 0.94,
        raw: rawText,
      });
    }

    // 5. Injury / Trauma / Fall Extraction
    if (
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
      });
    }

    // 6. Dyspnea / Breathing Difficulty Extraction (Section 5)
    if (
      rawText.includes('सांस लेने में दिक्कत नहीं') ||
      rawText.includes('सांस लेने में कोई तकलीफ नहीं') ||
      rawText.includes('सांस में कोई दिक्कत नहीं') ||
      rawText.includes('श्वास घेण्यास त्रास नाही') ||
      rawText.includes('no breathing difficulty') ||
      rawText.includes('no shortness of breath')
    ) {
      extractions.push({
        concept: 'symptom.dyspnea',
        attribute: 'presence',
        value: false,
        status: 'ABSENT',
        confidence: 0.96,
      });
    } else if (
      rawText.includes('सांस') ||
      rawText.includes('श्वास') ||
      rawText.includes('breath') ||
      rawText.includes('dyspnea') ||
      rawText.includes('shortness of breath')
    ) {
      extractions.push({
        concept: 'symptom.dyspnea',
        attribute: 'presence',
        value: true,
        status: 'PRESENT',
        confidence: 0.98,
      });
    }

    // 7. Swelling / Weight-Bearing Extraction with Negation (Section 7)
    const isSwellingContext = activeContext.includes('swelling') || activeContext.includes('सूजन') || activeContext.includes('सूज');
    if (
      rawText.includes('सूजन नहीं') ||
      rawText.includes('सूज नाही') ||
      rawText.includes('no swelling') ||
      rawText.includes('not swollen') ||
      ((rawText.includes('नहीं, बिल्कुल नहीं') || rawText.includes('नाही, अजिबात नाही') || rawText.includes('बिल्कुल नहीं') || rawText.includes('नाही') || rawText.includes('नहीं')) && isSwellingContext)
    ) {
      extractions.push({
        concept: 'symptom.injury',
        attribute: 'swelling',
        value: false,
        status: 'ABSENT',
        confidence: 0.96,
      });
    } else if (
      rawText.includes('सूज') ||
      rawText.includes('सुज') ||
      rawText.includes('सूजन') ||
      rawText.includes('swelling') ||
      rawText.includes('swollen')
    ) {
      extractions.push({
        concept: 'symptom.injury',
        attribute: 'swelling',
        value: true,
        status: 'PRESENT',
        confidence: 0.93,
      });
    }

    // 8. Food Relation / Trigger
    if (
      rawText.includes('जेवल्यानंतर') ||
      rawText.includes('खाल्ल्यानंतर') ||
      rawText.includes('जेवण') ||
      rawText.includes('खाना खाने के बाद') ||
      rawText.includes('after eating') ||
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

    // 9. Natural Duration Extraction (Section 2 & 3)
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
      rawText.includes('सहा ते सात') ||
      rawText.includes('6-7') ||
      rawText.includes('6 7') ||
      rawText.includes('6 to 7') ||
      rawText.includes('6/7') ||
      rawText.includes('six or seven') ||
      rawText.includes('six to seven')
    ) {
      parsedDuration = { min: 6, max: 7, unit: 'days' };
    } else if (
      rawText.includes('दो तीन दिन') ||
      rawText.includes('2-3') ||
      rawText.includes('२-३') ||
      rawText.includes('two to three')
    ) {
      parsedDuration = { min: 2, max: 3, unit: 'days' };
    } else if (
      rawText.includes('तीन चार दिन') ||
      rawText.includes('3-4') ||
      rawText.includes('३-४') ||
      rawText.includes('three to four')
    ) {
      parsedDuration = { min: 3, max: 4, unit: 'days' };
    // B. Approximate durations: about a week, two weeks, or 7 days
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
    // C. Vague / Unspecified Duration: DO NOT invent a number!
    } else if (
      rawText.includes('काफी समय से') ||
      rawText.includes('बहुत दिनों से') ||
      rawText.includes('काफी दिनों से') ||
      rawText.includes('कई दिनों से') ||
      rawText.includes('कई हफ्तों से') ||
      rawText.includes('पिछले महीने से') ||
      rawText.includes('करीब दो महीने से') ||
      rawText.includes('कुछ दिनों से') ||
      rawText.includes('खूप दिवसांपासून') ||
      rawText.includes('गेले काही दिवस') ||
      rawText.includes('काही दिवसांपासून') ||
      rawText.includes('फार दिवसांपासून') ||
      rawText.includes('quite some time') ||
      rawText.includes('for some time') ||
      rawText.includes('for a long time') ||
      rawText.includes('many days') ||
      rawText.includes('few days')
    ) {
      isVague = true;
      const match = rawText.match(/(काफी समय से|बहुत दिनों से|काफी दिनों से|कई दिनों से|कई हफ्तों से|पिछले महीने से|करीब दो महीने से|कुछ दिनों से|खूप दिवसांपासून|गेले काही दिवस|काही दिवसांपासून|quite some time|for some time|for a long time)/i);
      rawVagueText = match ? match[0] : 'काफी समय से';
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

    // 10. Natural Severity Extraction with Negation (Section 6, 7)
    const hasNegatedSeverity =
      rawText.includes('बहुत ज्यादा नहीं') ||
      rawText.includes('ज्यादा नहीं') ||
      rawText.includes('तेज नहीं') ||
      rawText.includes('तीव्र नाही') ||
      rawText.includes('जास्त नाही') ||
      rawText.includes('not severe') ||
      rawText.includes('not too severe') ||
      rawText.includes('not very bad');

    let severityVal = null;
    let severityConf = 0.92;

    if (
      rawText.includes('असहनीय') ||
      rawText.includes('असह्य') ||
      rawText.includes('सहन होत नाही') ||
      rawText.includes('unbearable')
    ) {
      severityVal = 'UNBEARABLE';
      severityConf = 0.98;
    } else if (
      (rawText.includes('तीव्र') ||
        rawText.includes('बहुत ज्यादा') ||
        rawText.includes('खूप जास्त') ||
        rawText.includes('बहुत तेज') ||
        rawText.includes('काफी तेज') ||
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
      rawText.includes('बीच का') ||
      (hasNegatedSeverity && (rawText.includes('moderate') || rawText.includes('मध्यम') || rawText.includes('ठीक')))
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
      rawText.includes('mild') ||
      rawText.includes('slight') ||
      (hasNegatedSeverity && !rawText.includes('moderate'))
    ) {
      severityVal = 'MILD';
      severityConf = 0.92;
    }

    if (severityVal) {
      let sevConcept = 'symptom.pain';
      if (
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

    // 12. Vomiting & Abdominal Extractions
    if (
      (rawText.includes('उलटी') || rawText.includes('उल्टी') || rawText.includes('vomit') || rawText.includes('nausea') || rawText.includes('मळमळ')) &&
      !rawText.includes('उलटी नाही') && !rawText.includes('उल्टी नहीं')
    ) {
      extractions.push({
        concept: 'symptom.vomiting',
        attribute: 'presence',
        value: true,
        status: 'PRESENT',
        confidence: 0.98,
      });
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

    const payload = { extractions };
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

    // Check if knee presentation
    if (promptLower.includes('knee') || promptLower.includes('गुडघ') || promptLower.includes('घुटन')) {
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

