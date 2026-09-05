/**
 * Dynamic Question Schema (Section 10)
 * Strict schema validation for Qwen LLM dynamic clinical questioning.
 */

import { z } from 'zod';

export const dynamicQuestionSchema = z.object({
  shouldAskQuestion: z.boolean(),
  questionText: z.string().optional().nullable(),
  targetConcept: z.string().optional().nullable(),
  targetAttribute: z.string().optional().nullable(),
  priority: z.enum(['high', 'medium', 'low']).default('high'),
  options: z.array(z.string()).optional().default([]),
  reason: z.string().optional().nullable(),
}).refine((data) => {
  if (data.shouldAskQuestion) {
    return typeof data.questionText === 'string' && data.questionText.trim().length > 0;
  }
  return true;
}, {
  message: 'questionText is required and cannot be empty when shouldAskQuestion is true',
  path: ['questionText'],
});
