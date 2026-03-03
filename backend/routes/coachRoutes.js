import express from 'express';
import multer from 'multer';
import { chatWithCoach, initCoach, getChatHistory, ttsCoach, sttCoach } from '../controllers/coachController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Audio en memoria, sin tocar disco

// Todas las rutas del coach requieren autenticación
router.use(authMiddleware);

// GET  /api/coach/init     → primer mensaje personalizado generado por Gemini con perfil del usuario
router.get('/init', initCoach);

// GET  /api/coach/history  → últimos 50 mensajes del usuario (memoria persistente)
router.get('/history', getChatHistory);

// POST /api/coach/chat     → chat continuo (normal + simulación de entrevista)
router.post('/chat', chatWithCoach);

// POST /api/coach/tts      → texto → audio MP3 con OpenAI TTS (voz humana)
router.post('/tts', ttsCoach);

// POST /api/coach/stt      → audio → texto con OpenAI Whisper
router.post('/stt', upload.single('audio'), sttCoach);

export default router;
