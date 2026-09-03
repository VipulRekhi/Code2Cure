/**
 * Deterministic Clinical Rules Evaluator (Section 15, 16, 61)
 * Data-driven conditions using only explicit operators. No arbitrary code execution.
 */

export const OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'notEquals',
  CONTAINS: 'contains',
  IN: 'in',
  EXISTS: 'exists',
  NOT_EXISTS: 'notExists',
  GREATER_THAN: 'greaterThan',
  LESS_THAN: 'lessThan',
};

export const CLINICAL_RULES = [
  // When complaint is pain, location is required
  {
    id: 'rule.complaint-is-pain',
    when: {
      concept: 'symptom.pain',
      attribute: 'complaint_type',
      operator: 'equals',
      value: 'pain',
    },
    enables: ['q.pain.location', 'q.pain.duration', 'q.pain.severity', 'q.pain.character'],
  },

  // When complaint is fever, fever questions enabled
  {
    id: 'rule.complaint-is-fever',
    when: {
      concept: 'symptom.pain',
      attribute: 'complaint_type',
      operator: 'equals',
      value: 'fever',
    },
    enables: ['q.fever.duration', 'q.fever.pattern', 'q.fever.associated'],
  },

  // Adaptive Chest-specific follow-ups (Section 14 & 31)
  {
    id: 'rule.chest-pain-specifics',
    when: {
      concept: 'symptom.pain',
      attribute: 'location',
      operator: 'equals',
      value: 'chest',
    },
    enables: ['q.pain.radiation', 'q.pain.dyspnea', 'q.pain.sweating'],
    disables: [],
  },

  // When location is NOT chest (e.g. knee, head, abdomen)
  {
    id: 'rule.non-chest-pain',
    when: {
      concept: 'symptom.pain',
      attribute: 'location',
      operator: 'notEquals',
      value: 'chest',
    },
    disables: ['q.pain.radiation', 'q.pain.dyspnea', 'q.pain.sweating'],
  },
];

/**
 * Evaluates a single condition against the current clinical facts map
 */
export function evaluateCondition(condition, facts) {
  const { concept, attribute, operator, value } = condition;
  const factKey = `${concept}.${attribute}`;
  const fact = facts[factKey];

  switch (operator) {
    case OPERATORS.EXISTS:
      return fact !== undefined && fact !== null;

    case OPERATORS.NOT_EXISTS:
      return fact === undefined || fact === null;

    case OPERATORS.EQUALS:
      if (!fact) return false;
      return fact.value === value || JSON.stringify(fact.value) === JSON.stringify(value);

    case OPERATORS.NOT_EQUALS:
      if (!fact) return true;
      return fact.value !== value && JSON.stringify(fact.value) !== JSON.stringify(value);

    case OPERATORS.IN:
      if (!fact || !Array.isArray(value)) return false;
      return value.includes(fact.value);

    case OPERATORS.CONTAINS:
      if (!fact || !Array.isArray(fact.value)) return false;
      return fact.value.includes(value);

    case OPERATORS.GREATER_THAN:
      if (!fact || typeof fact.value !== 'number') return false;
      return fact.value > value;

    case OPERATORS.LESS_THAN:
      if (!fact || typeof fact.value !== 'number') return false;
      return fact.value < value;

    default:
      console.warn(`[Rules] Unknown operator: "${operator}"`);
      return false;
  }
}
