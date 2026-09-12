import { describe, it, expect, beforeEach } from 'vitest';
import {
  doctorState,
  setDoctorAuth,
  clearDoctorAuth,
  setPatientWorkspace,
  clearPatientWorkspace,
  setActiveTab,
} from '../js/doctor/doctorState.js';

import { renderDoctorLoginView } from '../js/doctor/views/loginView.js';
import { renderDoctorDashboardView } from '../js/doctor/views/dashboardView.js';
import { renderDoctorQueueView } from '../js/doctor/views/queueView.js';
import { renderDoctorAlertsView } from '../js/doctor/views/alertsView.js';
import { renderDoctorRegistryView } from '../js/doctor/views/registryView.js';
import { renderDoctorWorkspaceView } from '../js/doctor/views/workspaceView.js';
import { renderDoctorReportsView } from '../js/doctor/views/reportsView.js';
import { renderDoctorSettingsView } from '../js/doctor/views/settingsView.js';

describe('MediKiosk Phase 10 Doctor Clinical Portal Frontend Test Suite', () => {
  beforeEach(() => {
    clearDoctorAuth();
    clearPatientWorkspace();
  });

  it('renders Physician Login View with required credential fields and 1-click demo button', () => {
    const { html } = renderDoctorLoginView();
    expect(html).toContain('MediKiosk Clinical Portal');
    expect(html).toContain('Employee / Hospital ID');
    expect(html).toContain('Clinical Department');
    expect(html).toContain('Password / Digital Token');
    expect(html).toContain('Access Clinical Dashboard');
    expect(html).toContain('1-Click Demo Clinician Access');
  });

  it('renders Doctor Dashboard View with welcome banner and KPI cards', () => {
    setDoctorAuth(
      {
        name: 'Dr. Priya Deshmukh',
        employeeId: 'DOC-8942',
        department: 'General Medicine / OPD-3',
        hospital: 'District Civil Hospital, Pune',
      },
      'fake-jwt-token'
    );

    const { html } = renderDoctorDashboardView();
    expect(html).toContain('Welcome, Dr. Priya Deshmukh');
    expect(html).toContain("Today's OPD Queue");
    expect(html).toContain('Kiosk Self-Intakes');
    expect(html).toContain('Pending Reviews');
    expect(html).toContain('Critical Red-Flags');
    expect(html).toContain('Recent Kiosk Submissions');
  });

  it('renders Live OPD Queue View with filter buttons', () => {
    const { html } = renderDoctorQueueView();
    expect(html).toContain('Live OPD Consultation Queue');
    expect(html).toContain('All Patients');
    expect(html).toContain('Waiting');
    expect(html).toContain('Critical Red-Flags');
    expect(html).toContain('AYUSH');
    expect(html).toContain('Completed');
  });

  it('renders Priority Clinical Alerts View with red-flag header', () => {
    const { html } = renderDoctorAlertsView();
    expect(html).toContain('Priority Clinical Alerts & Red-Flags');
    expect(html).toContain('Immediate physician attention required');
  });

  it('renders Patient Registry View with search and filter controls', () => {
    const { html } = renderDoctorRegistryView();
    expect(html).toContain('Patients Registry & OPD Directory');
    expect(html).toContain('Search by Patient Name, ABHA ID, Token, or Chief Complaint');
    expect(html).toContain('Critical');
    expect(html).toContain('Needs Review');
  });

  it('renders Patient Workspace with all mandatory sections for General OPD patient', () => {
    const mockWorkspace = {
      sessionId: 'sess-gen-001',
      patient: {
        name: 'Ramesh Jadhav',
        age: '45 yrs',
        sex: 'Male',
        patientIdentifier: 'ABHA-982142',
      },
      token: 'OPD-8821',
      department: 'General Medicine',
      room: 'OPD Room 3',
      opdMode: 'GENERAL',
      isAyushMode: false,
      consultationStatus: 'WAITING',
      triage: {
        tier: 'NORMAL',
        hasRedFlag: false,
        redFlags: [],
      },
      verbalSummary: 'Patient reports moderate right knee pain for 4 days following a minor slip.',
      structuredSummary: {
        primaryConcern: 'knee_pain',
        primaryConcernDisplayName: 'Knee Pain',
        location: 'Right knee',
        duration: { min: 4, max: 4, unit: 'days' },
        severity: 'MODERATE',
        associatedSymptoms: [{ displayName: 'Mild swelling' }],
        negativeFindings: [{ displayName: 'Fever' }],
      },
      medications: {
        patientReported: [{ name: 'Paracetamol', dose: '500mg', frequency: 'SOS' }],
        documentExtracted: [{ name: 'Ibuprofen', dose: '400mg', frequency: 'BD' }],
        discrepancies: [{ message: 'Patient reported Paracetamol; prescription specifies Ibuprofen' }],
      },
      allergies: {
        status: 'ABSENT',
        substances: [],
      },
      documents: [
        {
          fileName: 'prescription_slip.jpg',
          documentType: 'PRESCRIPTION',
          ocrText: 'Tab Ibuprofen 400mg BD x 3 days',
          confidence: 0.96,
        },
      ],
      questionResponses: [
        {
          index: 1,
          questionId: 'q.chief_complaint',
          questionText: 'What is your main health concern?',
          patientAnswer: 'Knee Pain',
          source: 'PATIENT_TOUCH',
          status: 'PRESENT',
        },
        {
          index: 2,
          questionId: 'q.pain.duration',
          questionText: 'How long have you had this knee pain?',
          patientAnswer: '4 days',
          source: 'PATIENT_VOICE',
          status: 'PRESENT',
        },
      ],
      physicianNotes: [],
      isSignedOff: false,
    };

    setPatientWorkspace(mockWorkspace);

    const { html } = renderDoctorWorkspaceView();

    // 1. Patient Header
    expect(html).toContain('Ramesh Jadhav');
    expect(html).toContain('OPD-8821');
    expect(html).toContain('ABHA-982142');
    expect(html).toContain('45 yrs');

    // 2. Clinical Narrative Summary
    expect(html).toContain('Verified Clinical Narrative Summary');
    expect(html).toContain('Patient reports moderate right knee pain for 4 days');

    // 3. Structured Clinical Summary
    expect(html).toContain('Structured Clinical Intake Data');
    expect(html).toContain('Knee Pain');
    expect(html).toContain('Right knee');
    expect(html).toContain('4 days');
    expect(html).toContain('MODERATE');
    expect(html).toContain('Mild swelling');
    expect(html).toContain('Fever (ABSENT)');

    // 4. Clean Omission of AYUSH Card in General OPD
    expect(html).not.toContain('Dashavidha Pariksha');

    // 5. Separated Medications & Discrepancies
    expect(html).toContain('Medications & Allergies (Source Separated)');
    expect(html).toContain('Patient-Reported Medications');
    expect(html).toContain('Paracetamol');
    expect(html).toContain('Document-Extracted Medications');
    expect(html).toContain('Ibuprofen');
    expect(html).toContain('Medication Discrepancy Detected');
    expect(html).toContain('denied any known drug/food allergies');

    // 6. Documents & OCR
    expect(html).toContain('prescription_slip.jpg');
    expect(html).toContain('Tab Ibuprofen 400mg BD x 3 days');

    // 7. Complete Q&A Audit Log
    expect(html).toContain('Complete Patient Q&A Audit Trail');
    expect(html).toContain('What is your main health concern?');
    expect(html).toContain('How long have you had this knee pain?');
    expect(html).toContain('Patient Voice');

    // 8. Physician Notes & Actions
    expect(html).toContain('Physician Consultation Notes & Clinical Impressions');
    expect(html).toContain('Confirm Intake & Sign Off');
  });

  it('renders AYUSH assessment card when patient session is in AYUSH mode', () => {
    const mockAyushWorkspace = {
      sessionId: 'sess-ayu-001',
      patient: {
        name: 'Sunita Patil',
        age: '52 yrs',
        sex: 'Female',
        patientIdentifier: 'ABHA-774411',
      },
      token: 'AYU-7741',
      department: 'Ayurvedic OPD',
      room: 'OPD Room 3',
      opdMode: 'AYUSH',
      isAyushMode: true,
      consultationStatus: 'WAITING',
      triage: { tier: 'NORMAL', hasRedFlag: false, redFlags: [] },
      verbalSummary: 'Under Ayurvedic evaluation, patient presents Vata-predominant constitution with joint stiffness.',
      structuredSummary: {
        primaryConcern: 'joint_pain',
        primaryConcernDisplayName: 'Joint Pain (Sandhigata Vata)',
      },
      ayushAssessment: {
        dashavidha: {
          prakriti: { status: 'PRESENT', value: 'Vata-predominant' },
          vikriti: { status: 'PRESENT', value: 'Vata-Kapha aggravation' },
          sara: { status: 'PRESENT', value: 'Madhyama Sara' },
          samhanana: { status: 'PRESENT', value: 'Moderate build' },
          pramana: { status: 'PRESENT', value: 'Pramanyukta (Balanced)' },
          satmya: { status: 'PRESENT', value: 'Sarva-satmya' },
          sattva: { status: 'PRESENT', value: 'Pravara (Calm)' },
          ahara_shakti: { status: 'PRESENT', value: 'Vishamagni (Irregular)' },
          vyayama_shakti: { status: 'PRESENT', value: 'Avara (Fatigues easily)' },
          vaya: { status: 'PRESENT', value: 'Madhyama Vaya (Adult)' },
        },
        aharaVihara: {
          diet: { status: 'PRESENT', value: 'Vegetarian with irregular meal times' },
          bowel: { status: 'PRESENT', value: 'Krura Koshtha (Dry/hard)' },
          sleep: { status: 'PRESENT', value: 'Disturbed / broken sleep' },
          activity: { status: 'PRESENT', value: 'Sedentary work' },
        },
      },
      medications: { patientReported: [], documentExtracted: [], discrepancies: [] },
      documents: [],
      questionResponses: [],
    };

    setPatientWorkspace(mockAyushWorkspace);

    const { html } = renderDoctorWorkspaceView();

    expect(html).toContain('Sunita Patil');
    expect(html).toContain('AYU-7741');
    expect(html).toContain('AYUSH OPD');
    expect(html).toContain('AYUSH Assessment — Dashavidha Pariksha & Ahara-Vihara');
    expect(html).toContain('Prakriti (Natural Constitution)');
    expect(html).toContain('Vata-predominant');
    expect(html).toContain('Ahara Shakti (Digestive Capacity)');
    expect(html).toContain('Vishamagni (Irregular)');
    expect(html).toContain('Dietary Pattern (Ahara)');
    expect(html).toContain('Vegetarian with irregular meal times');
  });

  it('renders prominent red-flag alert banner for critical triage cases without hallucinating diagnoses', () => {
    const mockCriticalWorkspace = {
      sessionId: 'sess-crit-001',
      patient: {
        name: 'Anil Deshmukh',
        age: '58 yrs',
        patientIdentifier: 'ABHA-110022',
      },
      token: 'OPD-9911',
      department: 'General Medicine',
      room: 'OPD Room 3',
      opdMode: 'GENERAL',
      isAyushMode: false,
      consultationStatus: 'CRITICAL',
      triage: {
        tier: 'CRITICAL',
        hasRedFlag: true,
        redFlags: [
          {
            code: 'ACUTE_CHEST_PAIN_RED_FLAG',
            reason: 'Patient reported chest discomfort radiating to left arm with diaphoresis.',
          },
        ],
      },
      verbalSummary: 'Patient reports severe retrosternal pressure radiating to left arm with diaphoresis.',
      structuredSummary: {
        primaryConcern: 'chest_pain',
        primaryConcernDisplayName: 'Chest Pain',
      },
      medications: { patientReported: [], documentExtracted: [], discrepancies: [] },
      documents: [],
      questionResponses: [],
    };

    setPatientWorkspace(mockCriticalWorkspace);

    const { html } = renderDoctorWorkspaceView();

    expect(html).toContain('HIGH-PRIORITY RED-FLAG ALERT DETECTED');
    expect(html).toContain('ACUTE_CHEST_PAIN_RED_FLAG');
    expect(html).toContain('Patient reported chest discomfort radiating to left arm with diaphoresis.');
    expect(html).toContain('No autonomous medical diagnosis has been made');
  });

  it('enforces strict session isolation: clearing workspace leaves zero residual patient data', () => {
    const mockPatientA = {
      sessionId: 'sess-AAA',
      patient: { name: 'Patient Alpha' },
      token: 'OPD-AAA',
      verbalSummary: 'Alpha verbal summary',
      structuredSummary: { primaryConcern: 'fever' },
    };

    setPatientWorkspace(mockPatientA);
    expect(doctorState.currentPatientId).toBe('sess-AAA');
    expect(doctorState.workspaceData.patient.name).toBe('Patient Alpha');

    // Clear Patient A
    clearPatientWorkspace();
    expect(doctorState.currentPatientId).toBeNull();
    expect(doctorState.workspaceData).toBeNull();

    // Render workspace when cleared
    const { html: clearedHtml } = renderDoctorWorkspaceView();
    expect(clearedHtml).toContain('No Patient Selected');
    expect(clearedHtml).not.toContain('Patient Alpha');
    expect(clearedHtml).not.toContain('Alpha verbal summary');

    // Open Patient B
    const mockPatientB = {
      sessionId: 'sess-BBB',
      patient: { name: 'Patient Beta' },
      token: 'OPD-BBB',
      verbalSummary: 'Beta verbal summary',
      structuredSummary: { primaryConcern: 'cough' },
    };

    setPatientWorkspace(mockPatientB);
    const { html: betaHtml } = renderDoctorWorkspaceView();
    expect(betaHtml).toContain('Patient Beta');
    expect(betaHtml).toContain('Beta verbal summary');
    expect(betaHtml).not.toContain('Patient Alpha');
    expect(betaHtml).not.toContain('Alpha verbal summary');
  });

  it('renders Reports & Analytics View with clinical metrics', () => {
    const { html } = renderDoctorReportsView();
    expect(html).toContain('OPD Clinical Analytics & Throughput');
    expect(html).toContain('Aggregating clinical analytics from database');
  });

  it('renders Settings View with clinician preferences and profile', () => {
    setDoctorAuth(
      {
        name: 'Dr. Priya Deshmukh',
        employeeId: 'DOC-8942',
        hospital: 'District Civil Hospital, Pune',
        department: 'General Medicine / OPD-3',
      },
      'token-123'
    );

    const { html } = renderDoctorSettingsView();
    expect(html).toContain('Physician Profile & Clinical Preferences');
    expect(html).toContain('Dr. Priya Deshmukh');
    expect(html).toContain('DOC-8942');
    expect(html).toContain('Audible Red-Flag Chime');
    expect(html).toContain('Always Display AYUSH Dashavidha Assessment');
    expect(html).toContain('High Contrast Workstation Mode');
  });
});
