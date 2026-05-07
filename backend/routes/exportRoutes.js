import express from 'express';
import { exportCvPdf } from '../controllers/exportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All export routes require a valid JWT
router.use(authMiddleware);

// [SECURITY FIX #8] Límite de 50 MB aplicado únicamente aquí.
// El límite global del servidor se mantiene, este endpoint necesita
// recibir imágenes de perfil en base64 que pueden ser grandes.
const jsonLarge = express.json({ limit: '50mb' });
const urlencodedLarge = express.urlencoded({ limit: '50mb', extended: true });

// POST /api/export/pdf
// Body: { cvData, templateId, profilePicture? }
// Returns: application/pdf binary
router.post('/pdf', jsonLarge, urlencodedLarge, exportCvPdf);

export default router;
