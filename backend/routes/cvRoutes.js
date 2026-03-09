import express from 'express';
import { saveCvData } from '../controllers/cvController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All CV routes require authentication
router.use(authMiddleware);

// POST /api/cv/save  → guarda el JSON del CV en la BD; el PDF lo genera el frontend
router.post('/save', saveCvData);

export default router;
