/**
 * Voice Controller (Section 30, 41, 64, 65)
 * Handles Speech-to-Text (ASR) transcription and Text-to-Speech (TTS) synthesis endpoints.
 */

import { asrService } from '../modules/voice/asrService.js';
import { ttsService } from '../modules/voice/ttsService.js';
import { voiceConfig } from '../modules/voice/voiceConfig.js';
import { getQuestionById } from '../modules/questionEngine/index.js';

export const voiceController = {
  /**
   * POST /api/voice/asr
   * Transcribes patient audio to vernacular text via IndicConformer.
   */
  async transcribeAudio(req, res, next) {
    try {
      const {
        audioBase64,
        language = 'mr',
        sessionId = null,
        questionId = null,
        requestId = req.headers['x-request-id'] || null,
      } = req.body;

      let activeQuestion = null;
      if (questionId) {
        activeQuestion = getQuestionById(questionId);
      }

      const result = await asrService.transcribe({
        base64Audio: audioBase64,
        language,
        activeQuestion,
        requestId,
        sessionId,
      });

      if (!result.success) {
        return res.status(200).json({
          success: false,
          fallbackToTouch: true,
          error: result.error,
          message: result.message,
          data: {
            transcript: '',
            sessionId,
            questionId,
            requestId: result.requestId || requestId,
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          transcript: result.transcript,
          language: result.language,
          provider: result.provider,
          confidence: result.confidence,
          latency: result.latency,
          sessionId,
          questionId,
          requestId: result.requestId || requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/voice/tts
   * Synthesizes natural question speech via IndicF5 / neural engine.
   * Returns audio as stream or base64.
   */
  async synthesizeSpeech(req, res, next) {
    try {
      const {
        text,
        language = 'mr',
        questionId = null,
        requestId = req.headers['x-request-id'] || null,
      } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'MISSING_TEXT',
          message: 'text parameter is required',
          requestId,
        });
      }

      const result = await ttsService.synthesize({
        text,
        language,
        questionId,
      });

      if (!result.success || !result.audioBuffer) {
        return res.status(500).json({
          success: false,
          error: result.error || 'TTS_FAILED',
          message: result.message || 'Speech synthesis failed',
          requestId,
        });
      }

      const audioFormat = result.format || 'mp3';
      const contentType = audioFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';

      // If client requests raw audio streaming
      const acceptHeader = req.headers['accept'] || '';
      if (acceptHeader.includes('audio') || req.query.stream === 'true') {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', result.audioBuffer.length);
        if (requestId) res.setHeader('X-Request-Id', requestId);
        return res.status(200).send(result.audioBuffer);
      }

      // Default: Return JSON with base64 audio and metadata
      res.status(200).json({
        success: true,
        data: {
          audioBase64: result.audioBuffer.toString('base64'),
          format: audioFormat,
          sampleRate: result.sampleRate || 24000,
          language: result.language,
          provider: result.provider,
          cached: result.cached || false,
          latency: result.latency,
          requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/voice/status
   * Reports health and active provider configurations.
   */
  getStatus(req, res) {
    res.status(200).json({
      success: true,
      data: {
        asr: {
          provider: voiceConfig.asr.provider,
          mode: voiceConfig.asr.mode,
          endpoint: voiceConfig.asr.endpoint,
          sampleRate: voiceConfig.asr.sampleRate,
          supportedLanguages: voiceConfig.asr.supportedLanguages,
        },
        tts: {
          provider: voiceConfig.tts.provider,
          mode: voiceConfig.tts.mode,
          endpoint: voiceConfig.tts.endpoint,
          sampleRate: voiceConfig.tts.sampleRate,
          supportedLanguages: voiceConfig.tts.supportedLanguages,
        },
      },
    });
  },
};
