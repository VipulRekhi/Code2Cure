/**
 * Voice API Routes (Section 30, 38)
 */

import { Router } from 'express';
import { voiceController } from '../controllers/voice.controller.js';

export const voiceRouter = Router();

voiceRouter.post('/asr', voiceController.transcribeAudio);
voiceRouter.post('/tts', voiceController.synthesizeSpeech);
voiceRouter.get('/status', voiceController.getStatus);
