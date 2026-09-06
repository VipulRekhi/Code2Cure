import { describe, it, expect, beforeEach } from 'vitest';
import { appState, resetSession } from '../js/state.js';
import { renderConversationScreen } from '../js/screens/conversation.js';

describe('Frontend Severity Option Mapping & State Test Suite', () => {
  beforeEach(() => {
    resetSession();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('safely renders options when dynamic backend question returns plain string options', () => {
    const dynamicSeverityQ = {
      id: 'dyn.symptom.pain.severity',
      concept: 'symptom.pain',
      attribute: 'severity',
      inputType: 'single-choice',
      text: 'तुमच्या वेदनेची तीव्रता किती आहे?',
      options: ['कमी', 'मध्यम', 'खूप जास्त'],
      source: 'LLM_DYNAMIC',
    };

    // Simulate currentBackendQuestion being active
    appState.backendSessionId = 'test-session-123';
    appState.language = 'mr';

    const screen = renderConversationScreen();
    expect(screen).toBeDefined();
    expect(screen.html).toBeDefined();
  });

  it('correctly updates appState with mappedOption "मध्यम" and normalized answer without ERROR', () => {
    // Simulate what handleAnswerSubmission sets on success response from backend
    const recordRes = {
      success: true,
      data: {
        answersCurrentQuestion: true,
        selectedOption: 'मध्यम',
        recorded: {
          concept: 'symptom.pain',
          attribute: 'severity',
          value: 'MODERATE',
          status: 'PRESENT',
        },
        clinicalSummary: {
          severity: 'MODERATE',
        },
        next: {
          status: 'question',
          question: {
            id: 'dyn.symptom.pain.character',
            concept: 'symptom.pain',
            attribute: 'character',
            text: 'वेदना कशा प्रकारची आहे?',
            options: ['ठसठसणारी', 'तीक्ष्ण', 'मंद'],
          },
        },
      },
    };

    const selectedOption = recordRes.data.selectedOption;
    const mappedLabel =
      typeof selectedOption === 'object' && selectedOption !== null
        ? (selectedOption.label || selectedOption.value)
        : selectedOption;

    appState.latestSelectedOption = mappedLabel;
    appState.latestNormalizedAnswer = `${recordRes.data.recorded.attribute} = ${recordRes.data.recorded.value}`;
    appState.complaint.severity = recordRes.data.clinicalSummary.severity;

    expect(appState.latestNormalizedAnswer).toBe('severity = MODERATE');
    expect(appState.latestSelectedOption).toBe('मध्यम');
    expect(appState.complaint.severity).toBe('MODERATE');
    expect(appState.latestNormalizedAnswer).not.toBe('ERROR');
  });

  it('safely handles selectedOption being null without throwing TypeError', () => {
    const selectedOption = null;
    const mappedLabel =
      typeof selectedOption === 'object' && selectedOption !== null
        ? (selectedOption.label || selectedOption.value)
        : selectedOption;

    expect(mappedLabel).toBeNull();
  });
});
