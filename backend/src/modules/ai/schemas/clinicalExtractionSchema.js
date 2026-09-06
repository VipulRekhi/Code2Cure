/**
 * Clinical Extraction Output Schema (Section 11 & 12)
 * Validates structured JSON returned by Qwen 2.5 7B Instruct.
 */

import { z } from 'zod';

export const extractionItemSchema = z.object({
  concept: z.string().min(1, 'Clinical concept identifier required'),
  attribute: z.string().min(1, 'Clinical attribute identifier required'),
  value: z.any(),
  unit: z.string().nullable().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'UNKNOWN', 'NOT_PROVIDED', 'DECLINED']).default('PRESENT'),
  confidence: z.number().nullable().optional(),
  raw: z.string().nullable().optional(),
  precision: z.string().nullable().optional(),
  radiationFrequency: z.string().nullable().optional(),
  radiationExtent: z.string().nullable().optional(),
}).passthrough();

export const clinicalExtractionSchema = z.object({
  extractions: z.array(extractionItemSchema),
  answersCurrentQuestion: z.boolean().optional(),
}).passthrough();
