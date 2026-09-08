import { describe, it, expect, beforeEach } from 'vitest';
import { appState, resetSession, setLanguage } from '../js/state.js';
import { renderPatientReviewScreen, resetPatientReviewSummary, setLoadedSummary } from '../js/screens/patientReview.js';

describe('Phase 9 Frontend: AYUSH Mode & Dashavidha Pariksha Review Suite', () => {
  beforeEach(() => {
    resetSession();
    resetPatientReviewSummary();
    setLanguage('en');
  });

  it('TEST 1: Renders dedicated AYUSH card with Dashavidha and Ahara-Vihara in English', () => {
    setLanguage('en');
    setLoadedSummary({
      primaryConcern: 'knee_pain',
      primaryConcernDetails: { concern: 'knee_pain', displayName: 'Knee Pain' },
      ayushAssessment: {
        opdMode: 'AYUSH',
        dashavidha: {
          prakriti: { parameter: 'Prakriti (Natural Constitution)', value: 'vata_dominant', status: 'PRESENT' },
          vikriti: { parameter: 'Vikriti (Current Aggravation)', value: 'dryness_pain_stiffness', status: 'PRESENT' },
          ahara_shakti: { parameter: 'Ahara Shakti', value: 'tikshnagni', status: 'PRESENT' },
          vyayama_shakti: { parameter: 'Vyayama Shakti', value: 'madhyama', status: 'PRESENT' },
        },
        aharaVihara: {
          diet_pattern: { parameter: 'Diet Pattern', value: 'vegetarian_fresh', status: 'PRESENT' },
          bowel_pattern: { parameter: 'Bowel Routine', value: 'regular_clear', status: 'PRESENT' },
          sleep_pattern: { parameter: 'Sleep Quality', value: 'sound_restful', status: 'PRESENT' },
          activity_pattern: { parameter: 'Activity Pattern', value: 'moderate_active', status: 'PRESENT' },
        },
      },
    });

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('Ayurvedic Assessment (Dashavidha Pariksha & Ahara-Vihara)');
    expect(screen.html).toContain('AYUSH OPD Mode');
    expect(screen.html).toContain('Dashavidha Pariksha');
    expect(screen.html).toContain('Ahara-Vihara');
    expect(screen.html).toContain('Not an autonomous dosha diagnosis');
    expect(screen.html).toContain('vata dominant');
    expect(screen.html).toContain('vegetarian fresh');
  });

  it('TEST 2: Renders AYUSH card in Marathi with proper Devanagari terminology', () => {
    setLanguage('mr');
    setLoadedSummary({
      primaryConcern: 'knee_pain',
      primaryConcernDetails: { concern: 'knee_pain', displayName: 'गुडघेदुखी' },
      ayushAssessment: {
        opdMode: 'AYUSH',
        dashavidha: {
          prakriti: { parameter: 'Prakriti', value: 'pitta_dominant', status: 'PRESENT' },
          ahara_shakti: { parameter: 'Ahara Shakti', value: 'samagni', status: 'PRESENT' },
        },
        aharaVihara: {
          diet_pattern: { parameter: 'Diet Pattern', value: 'vegetarian_fresh', status: 'PRESENT' },
          bowel_pattern: { parameter: 'Bowel Routine', value: 'constipated_hard', status: 'PRESENT' },
        },
      },
    });

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('आयुर्वेदिक मूल्यांकन (दशविध परीक्षा आणि आहार-विहार)');
    expect(screen.html).toContain('दशविध परीक्षा (१० मापदंड)');
    expect(screen.html).toContain('आहार-विहार मूल्यांकन (खानपान व जीवनशैली)');
    expect(screen.html).toContain('प्रकृती');
    expect(screen.html).toContain('आहार शक्ती');
    expect(screen.html).toContain('हे कोणतेही स्वयंचलित दोष निदान किंवा औषधोपचार नाही');
  });

  it('TEST 3: Renders AYUSH card in Hindi with proper Devanagari terminology', () => {
    setLanguage('hi');
    setLoadedSummary({
      primaryConcern: 'knee_pain',
      primaryConcernDetails: { concern: 'knee_pain', displayName: 'घुटने में दर्द' },
      ayushAssessment: {
        opdMode: 'AYUSH',
        dashavidha: {
          prakriti: { parameter: 'Prakriti', value: 'kapha_dominant', status: 'PRESENT' },
          ahara_shakti: { parameter: 'Ahara Shakti', value: 'mandagni', status: 'PRESENT' },
        },
        aharaVihara: {
          diet_pattern: { parameter: 'Diet Pattern', value: 'vegetarian_fresh', status: 'PRESENT' },
          sleep_pattern: { parameter: 'Sleep Routine', value: 'sound_restful', status: 'PRESENT' },
        },
      },
    });

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('आयुर्वेदिक मूल्यांकन (दशविध परीक्षा एवं आहार-विहार)');
    expect(screen.html).toContain('दशविध परीक्षा (10 मापदंड)');
    expect(screen.html).toContain('आहार-विहार मूल्यांकन');
    expect(screen.html).toContain('प्रकृति');
    expect(screen.html).toContain('आहार शक्ति');
    expect(screen.html).toContain('यह कोई स्वचालित दोष निदान या दवा पर्चा नहीं है');
  });

  it('TEST 4: In non-AYUSH mode (ayushAssessment is null), AYUSH card is completely omitted', () => {
    setLanguage('en');
    setLoadedSummary({
      primaryConcern: 'fever',
      primaryConcernDetails: { concern: 'fever', displayName: 'Fever' },
      ayushAssessment: null,
    });

    const screen = renderPatientReviewScreen();
    expect(screen.html).not.toContain('Ayurvedic Assessment');
    expect(screen.html).not.toContain('Dashavidha Pariksha');
    expect(screen.html).not.toContain('Ahara-Vihara');
  });

  it('TEST 5: Handles unknown / not provided parameters with proper status badges', () => {
    setLanguage('en');
    setLoadedSummary({
      primaryConcern: 'knee_pain',
      primaryConcernDetails: { concern: 'knee_pain' },
      ayushAssessment: {
        opdMode: 'AYUSH',
        dashavidha: {
          sara: { parameter: 'Sara (Vitality)', value: 'unknown', status: 'UNKNOWN' },
          samhanana: { parameter: 'Samhanana', value: null, status: 'NOT_PROVIDED' },
        },
        aharaVihara: {},
      },
    });

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('Unknown');
    expect(screen.html).toContain('Not provided');
  });
});
