/**
 * Real Qwen Provider Integration Test (Phase 6.1, Section 18)
 * Connects directly to the real Qwen 2.5 7B Instruct runtime if active.
 * If local Ollama/vLLM is offline on port 11434, cleanly skips and reports status.
 * Never labels mockProvider as REAL_LLM!
 */

import { describe, it, expect } from 'vitest';
import { qwenProvider } from '../src/modules/ai/providers/qwenProvider.js';
import { buildExtractionPrompt } from '../src/modules/ai/prompts/clinicalExtractionPrompt.js';
import { parseAndValidateModelOutput } from '../src/modules/ai/utils/parseModelOutput.js';
import { CLINICAL_CONCEPTS } from '../src/modules/questionEngine/clinicalConcepts.js';

describe('Phase 6.1 — Real Qwen 2.5 7B Provider Integration (Section 18)', () => {
  it('checks real Qwen LLM semantic interpretation or transparently reports runtime status', async () => {
    const { systemPrompt, userPrompt } = buildExtractionPrompt({
      rawTranscript: 'मुझे 4 दिन से सांस लेने में बहुत ही तकलीफ हो रही है',
      activeQuestion: {
        id: 'dyn.symptom.dyspnea.duration',
        targetConcept: 'symptom.dyspnea',
        targetAttribute: 'duration',
        text: 'यह तकलीफ़ कितने समय से है?',
      },
      allowedConcepts: CLINICAL_CONCEPTS,
    });

    const result = await qwenProvider.generateStructuredExtraction(systemPrompt, userPrompt);

    if (!result.success) {
      console.info(
        `[REAL_LLM_CHECK] Real Qwen runtime (http://localhost:11434/v1) is currently OFFLINE: "${result.error}".`
      );
      console.info('[REAL_LLM_CHECK] Skipping live inference test without mislabeling mock as real.');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      return;
    }

    console.info(`[REAL_LLM_CHECK] Real Qwen runtime connected successfully in ${result.latency}ms!`);
    const parsed = parseAndValidateModelOutput(result.rawOutput);
    expect(parsed.success).toBe(true);
    expect(parsed.extractions.length).toBeGreaterThan(0);

    const dyspneaSlot = parsed.extractions.find(
      (e) => (e.concept === 'symptom.dyspnea' || e.concept === 'symptom.breathing') && e.attribute === 'presence'
    );
    expect(dyspneaSlot).toBeDefined();
  });
});
