import express from 'express';
import { chatWithCoach, initCoach, getChatHistory } from '../controllers/coachController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas del coach requieren autenticación
router.use(authMiddleware);

// GET  /api/coach/init     → primer mensaje personalizado generado por Gemini con perfil del usuario
router.get('/init', initCoach);

// GET  /api/coach/history  → últimos 50 mensajes del usuario (memoria persistente)
router.get('/history', getChatHistory);

// POST /api/coach/chat     → chat continuo (normal + simulación de entrevista)
router.post('/chat', chatWithCoach);

export default router;
