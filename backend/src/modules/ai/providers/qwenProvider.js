/**
 * Qwen 2.5 7B Instruct Provider Adapter (Section 9)
 * Communicates with local OpenAI-compatible inference runtimes (vLLM / Ollama).
 */

import { aiConfig } from '../aiConfig.js';

export const qwenProvider = {
  name: 'qwen2.5-7b-instruct',

  async generateStructuredExtraction(systemPrompt, userPrompt) {
    const startTime = Date.now();
    const endpoint = `${aiConfig.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiConfig.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          latency,
        };
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      return {
        success: true,
        rawOutput: content,
        latency,
      };
    } catch (err) {
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';

      return {
        success: false,
        error: isTimeout ? `Model request timed out after ${aiConfig.timeoutMs}ms` : err.message,
        isTimeout,
        latency,
      };
    }
  },

  async generateDynamicQuestion(systemPrompt, userPrompt) {
    const startTime = Date.now();
    const endpoint = `${aiConfig.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiConfig.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: aiConfig.temperature || 0.2,
          max_tokens: aiConfig.maxTokens || 350,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          latency,
        };
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      return {
        success: true,
        rawOutput: content,
        latency,
      };
    } catch (err) {
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';

      return {
        success: false,
        error: isTimeout ? `Model request timed out after ${aiConfig.timeoutMs}ms` : err.message,
        isTimeout,
        latency,
      };
    }
  },
};
