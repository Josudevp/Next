import express from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Aplica el middleware para asegurar que la ruta esté protegida
router.use(authMiddleware);

// Endpoint GET para obtener los datos
router.get('/profile', getProfile);

// Endpoint PUT para actualizar área, skills, etc.
router.put('/update', updateProfile);

export default router;
