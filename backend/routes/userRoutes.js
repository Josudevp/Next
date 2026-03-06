import express from 'express';
import { getProfile, updateProfile, uploadProfile, uploadMiddleware } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Aplica el middleware para asegurar que la ruta esté protegida
router.use(authMiddleware);

// Endpoint GET para obtener los datos
router.get('/profile', getProfile);

// Endpoint PUT para actualizar área, skills, etc. (JSON — compatibilidad con ProfileEdit)
router.put('/update', updateProfile);

// Endpoint PUT para subir foto + CV + datos del perfil (multipart/form-data)
router.put('/profile', uploadMiddleware, uploadProfile);

export default router;
