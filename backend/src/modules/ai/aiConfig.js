/**
 * AI Service Configuration (Section 6, 31, 32)
 * Centralized settings for open-source Qwen 2.5 7B Instruct & local inference runtimes.
 */

import dotenv from 'dotenv';
dotenv.config();

export const aiConfig = {
  provider: process.env.AI_PROVIDER || 'qwen',
  mode: process.env.AI_MODE || 'mock', // 'qwen' | 'mock'
  model: process.env.AI_MODEL || 'qwen2.5:7b-instruct',
  baseUrl: process.env.AI_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.AI_API_KEY || 'not-needed-for-local',
  timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '8000', 10),
  temperature: 0.1, // Near-zero for deterministic extraction
  maxTokens: 512,
};
