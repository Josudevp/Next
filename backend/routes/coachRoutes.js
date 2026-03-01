import express from 'express';
import { chatWithCoach } from '../controllers/coachController.js';

const router = express.Router();

// Endpoint POST para el chat con el entrenador IA
router.post('/chat', chatWithCoach);

export default router;
