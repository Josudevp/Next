import express from 'express';
import { generateCvDocument } from '../controllers/cvController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All CV routes require authentication
router.use(authMiddleware);

// POST /api/cv/generate  → recibe JSON con datos del CV y devuelve DOCX descargable
router.post('/generate', generateCvDocument);

export default router;
