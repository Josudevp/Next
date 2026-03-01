const express = require('express');
const router = express.Router(); // Usamos el enrutador de Express
const authController = require('../controllers/authController'); // Importamos la lógica

// Ruta para registrarse: POST /api/auth/register
// Cuando alguien haga POST aquí, se ejecuta la función 'register' del controlador
router.post('/register', authController.register);

// Ruta para iniciar sesión: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;