import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { searchJobs } from '../controllers/jobController.js';

const router = Router();

// GET /api/jobs/search → protegida por JWT
router.get('/search', authMiddleware, searchJobs);

export default router;
