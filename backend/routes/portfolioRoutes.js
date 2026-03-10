import express from 'express';
import { generatePortfolio } from '../controllers/portfolioController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/portfolio/generate  → returns a self-contained HTML file
router.get('/generate', generatePortfolio);

export default router;
