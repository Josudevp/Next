import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// Ruta: POST /api/auth/register
router.post('/register', register);

// Ruta: POST /api/auth/login
router.post('/login', login);

export default router;