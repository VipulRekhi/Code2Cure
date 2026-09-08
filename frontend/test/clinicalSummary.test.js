import { describe, it, expect, beforeEach } from 'vitest';
import { appState, resetSession, setLanguage } from '../js/state.js';
import { renderPatientReviewScreen, resetPatientReviewSummary } from '../js/screens/patientReview.js';

describe('Phase 8 Frontend Patient Review & Verified Summary Suite', () => {
  beforeEach(() => {
    resetSession();
    resetPatientReviewSummary();
    setLanguage('mr');
  });

  it('renders Section 1 (Main Concern) with duration, location, and severity in Marathi', () => {
    appState.complaint.id = 'knee_pain';
    appState.complaint.duration = { value: 4, unit: 'days' };
    appState.complaint.location = 'उजवा गुडघा';
    appState.complaint.severity = 'MODERATE';
    appState.complaint.textPatientSpoken = 'माझं गुडघं चार दिवसांपासून दुखतंय';

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('तुमचा मुख्य त्रास');
    expect(screen.html).toContain('गुडघेदुखी');
    expect(screen.html).toContain('माझं गुडघं चार दिवसांपासून दुखतंय');
    expect(screen.html).toContain('4 days');
    expect(screen.html).toContain('उजवा गुडघा');
  });

  it('renders Section 1 in Hindi with proper Devanagari terminology', () => {
    setLanguage('hi');
    appState.complaint.id = 'fever';
    appState.complaint.duration = { value: 3, unit: 'days' };
    appState.complaint.textPatientSpoken = 'मुझे तीन दिन से बुखार है';

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('आपकी मुख्य समस्या');
    expect(screen.html).toContain('बुखार');
    expect(screen.html).toContain('मुझे तीन दिन से बुखार है');
    expect(screen.html).toContain('3 days');
  });

  it('renders Section 1 in English with clean healthcare styling', () => {
    setLanguage('en');
    appState.complaint.id = 'knee_pain';
    appState.complaint.duration = { value: 4, unit: 'days' };
    appState.complaint.location = 'Right knee';
    appState.complaint.severity = 'MODERATE';

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('Your Main Concern');
    expect(screen.html).toContain('Knee Pain');
    expect(screen.html).toContain('Right knee');
    expect(screen.html).toContain('Moderate');
  });

  it('renders separated medication sources and flags discrepancies', () => {
    setLanguage('en');
    appState.documents = [
      {
        name: 'rx.jpg',
        extractedData: {
          medications: [
            { drugName: 'Paracetamol', dose: '650 mg', frequency: '1-0-1' },
          ],
        },
      },
    ];

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('Medicines & Allergies');
    expect(screen.html).toContain('Found in Uploaded Prescription');
    expect(screen.html).toContain('Paracetamol');
    expect(screen.html).toContain('650 mg');
  });

  it('renders uploaded records with PaddleOCR badge', () => {
    setLanguage('mr');
    appState.documents = [
      {
        name: 'marathi_prescription.png',
        extractedData: {
          medications: [{ drugName: 'पॅरासिटामॉल', dose: '६५० मिग्रॅ' }],
        },
      },
    ];

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('तुमचे जोडलेले वैद्यकीय कागदपत्र');
    expect(screen.html).toContain('marathi_prescription.png');
    expect(screen.html).toContain('Scanned by PaddleOCR');
    expect(screen.html).toContain('पॅरासिटामॉल');
  });

  it('renders full verifiable Q&A history with change answer buttons', () => {
    setLanguage('mr');
    appState.conversationHistory = [
      {
        questionId: 'q.pain.duration',
        questionText: 'हा त्रास कधीपासून सुरू आहे?',
        patientResponse: '४ दिवसांपासून',
        normalizedAnswer: '4 days',
        inputMethod: 'VOICE',
        originalTranscript: '४ दिवसांपासून',
      },
    ];

    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('सर्व प्रश्न आणि तुमची उत्तरे');
    expect(screen.html).toContain('हा त्रास कधीपासून सुरू आहे?');
    expect(screen.html).toContain('४ दिवसांपासून');
    expect(screen.html).toContain('बदला');
  });

  it('renders patient confirmation checkbox and clinician submit button', () => {
    setLanguage('en');
    const screen = renderPatientReviewScreen();
    expect(screen.html).toContain('chk-patient-confirm');
    expect(screen.html).toContain('I confirm this information is correct');
    expect(screen.html).toContain('SUBMIT TO CLINICIAN');
    expect(screen.html).toContain('It is not a medical diagnosis');
  });
});
