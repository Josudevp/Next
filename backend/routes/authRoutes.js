import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, forgotPassword, resetPassword, googleLogin } from '../controllers/authController.js';

const router = express.Router();

// [SECURITY FIX #4] Rate limiting para prevenir brute force (MITRE T1110) y
// abuso de endpoints de autenticación.

// Login y recuperación: máximo 5 intentos cada 15 minutos
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { mensaje: 'Demasiados intentos. Por favor espera 15 minutos e intenta de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registro: máximo 10 cuentas por hora desde la misma IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { mensaje: 'Demasiados registros desde esta IP. Por favor intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Ruta: POST /api/auth/register
router.post('/register', registerLimiter, register);

// Ruta: POST /api/auth/login
router.post('/login', strictAuthLimiter, login);

// Ruta: POST /api/auth/google
router.post('/google', googleLogin);

// Ruta: POST /api/auth/forgot-password
router.post('/forgot-password', strictAuthLimiter, forgotPassword);

// Ruta: POST /api/auth/reset-password/:token
router.post('/reset-password/:token', resetPassword);

export default router;