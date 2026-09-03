/**
 * Mock Clinical Question Nodes (Section 41)
 * Preparing the frontend for the Phase 3 Question Engine without premature clinical reasoning.
 */

export const MOCK_QUESTION_FLOW = [
  {
    id: 'DURATION',
    slotKey: 'duration',
    titleKey: 'qDurationTitle',
    audioKey: 'qDurationTitle',
    inputType: 'SINGLE_CHOICE',
    options: [
      { id: 'today', value: { value: 1, unit: 'days' }, labelKey: 'optToday', icon: '⏱️' },
      { id: 'yesterday', value: { value: 2, unit: 'days' }, labelKey: 'optYesterday', icon: '📅' },
      { id: 'few_days', value: { value: 3, unit: 'days' }, labelKey: 'optFewDays', icon: '📆' },
      { id: 'week_plus', value: { value: 7, unit: 'days' }, labelKey: 'optWeekPlus', icon: '🗓️' },
    ],
  },
  {
    id: 'SEVERITY',
    slotKey: 'severity',
    titleKey: 'qSeverityTitle',
    audioKey: 'qSeverityTitle',
    inputType: 'SINGLE_CHOICE',
    options: [
      { id: 'mild', value: 'MILD', labelKey: 'optMild', icon: '🙂' },
      { id: 'moderate', value: 'MODERATE', labelKey: 'optModerate', icon: '😐' },
      { id: 'severe', value: 'SEVERE', labelKey: 'optSevere', icon: '😣' },
      { id: 'very_severe', value: 'VERY_SEVERE', labelKey: 'optVerySevere', icon: '😖' },
    ],
  },
  {
    id: 'NATURE',
    slotKey: 'character',
    titleKey: 'qNatureTitle',
    audioKey: 'qNatureTitle',
    inputType: 'SINGLE_CHOICE',
    options: [
      { id: 'pressure', value: 'PRESSURE', labelKey: 'optPressure', icon: '🪨' },
      { id: 'sharp', value: 'SHARP', labelKey: 'optSharp', icon: '⚡' },
      { id: 'burning', value: 'BURNING', labelKey: 'optBurning', icon: '🔥' },
      { id: 'dull', value: 'DULL', labelKey: 'optDull', icon: '〰️' },
    ],
  },
];
