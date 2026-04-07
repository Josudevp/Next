import express from 'express';
import { exportCvPdf } from '../controllers/exportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All export routes require a valid JWT
router.use(authMiddleware);

// [SECURITY FIX #8] Límite de 10 MB aplicado únicamente aquí.
// El límite global del servidor es 100 KB — solo este endpoint necesita
// recibir imágenes de perfil en base64 que pueden ser grandes.
const jsonLarge = express.json({ limit: '10mb' });

// POST /api/export/pdf
// Body: { cvData, templateId, profilePicture? }
// Returns: application/pdf binary
router.post('/pdf', jsonLarge, exportCvPdf);

export default router;
