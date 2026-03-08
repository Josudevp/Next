import express from 'express';
import { register, login, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = express.Router();

// Ruta: POST /api/auth/register
router.post('/register', register);

// Ruta: POST /api/auth/login
router.post('/login', login);

// Ruta: POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// Ruta: POST /api/auth/reset-password/:token
router.post('/reset-password/:token', resetPassword);

export default router;