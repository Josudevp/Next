import express from 'express';
import { exportCvPdf } from '../controllers/exportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All export routes require a valid JWT
router.use(authMiddleware);

// POST /api/export/pdf
// Body: { cvData, templateId, profilePicture? }
// Returns: application/pdf binary
router.post('/pdf', exportCvPdf);

export default router;
