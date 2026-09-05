/**
 * Deterministic Question Selector (Section 12, 17, 18, 35, 45, 49)
 * Selects the next highest priority eligible question using pure rules and state.
 */

import { QUESTION_CATALOG } from './questionCatalog.js';
import { CLINICAL_RULES, evaluateCondition } from './questionRules.js';

const PRIORITY_WEIGHTS = {
  critical: 4,
  high: 3,
  normal: 2,
  optional: 1,
};

export class QuestionSelector {
  constructor() {
    this.catalog = QUESTION_CATALOG;
    this.rules = CLINICAL_RULES;
  }

  /**
   * Evaluates all rules against current clinical facts to determine enabled question IDs.
   */
  getEligibleQuestionIds(sessionState) {
    const facts = sessionState.collectedFacts;
    const enabledIds = new Set();
    const disabledIds = new Set();

    // 1. Initial baseline questions always eligible:
    enabledIds.add('q.chief_complaint');

    // History questions are always enabled once the chief complaint has been given:
    if (sessionState.completedQuestionIds.has('q.chief_complaint')) {
      enabledIds.add('q.history.conditions');
      enabledIds.add('q.history.allergies');
    }

    // 2. Evaluate rules against collected facts:
    for (const rule of this.rules) {
      const isTriggered = evaluateCondition(rule.when, facts);
      if (isTriggered) {
        rule.enables?.forEach((id) => enabledIds.add(id));
        rule.disables?.forEach((id) => disabledIds.add(id));
      } else {
        // If not triggered, any question exclusively enabled by this rule should NOT be included
        // (unless enabled by baseline)
      }
    }

    // 3. Remove explicitly disabled IDs:
    for (const disabledId of disabledIds) {
      enabledIds.delete(disabledId);
    }

    return enabledIds;
  }

  /**
   * Finds the next unanswered eligible question.
   */
  getNextQuestion(sessionState) {
    const eligibleIds = this.getEligibleQuestionIds(sessionState);

    // Filter catalog to eligible, unanswered questions
    const candidateQuestions = this.catalog.filter((q) => {
      if (!eligibleIds.has(q.id)) return false;
      if (sessionState.completedQuestionIds.has(q.id)) return false;

      // Skip questions if the slot was already populated with a concrete value from voice extraction
      const factKey = `${q.concept}.${q.attribute}`;
      const existingFact = sessionState.collectedFacts[factKey];
      if (
        existingFact &&
        existingFact.value !== undefined &&
        existingFact.value !== null &&
        existingFact.value !== 'unknown'
      ) {
        return false;
      }

      return true;
    });

    if (candidateQuestions.length === 0) {
      return null; // All eligible questions answered
    }

    // Sort by priority weight (critical first) then catalog index (stable order)
    candidateQuestions.sort((a, b) => {
      const weightA = PRIORITY_WEIGHTS[a.priority] || 0;
      const weightB = PRIORITY_WEIGHTS[b.priority] || 0;
      return weightB - weightA;
    });

    return candidateQuestions[0];
  }

  /**
   * Computes progress estimation (Section 45).
   */
  getProgress(sessionState) {
    const eligibleIds = this.getEligibleQuestionIds(sessionState);
    const totalEstimated = eligibleIds.size;
    const completed = sessionState.completedQuestionIds.size;
    const percentage = totalEstimated > 0 ? Math.min(100, Math.round((completed / totalEstimated) * 100)) : 0;

    return {
      completed,
      totalEstimated,
      percentage,
      isComplete: completed >= totalEstimated && totalEstimated > 0,
    };
  }
}
