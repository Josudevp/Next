import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ----------------------------------------------------
// FUNCION 1: REGISTRAR UN NUEVO USUARIO
// ----------------------------------------------------
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. ¿El usuario ya existe?
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ mensaje: 'Este correo ya está en uso' });
    }

    // 2. Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Crear el usuario en la Base de Datos
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // 4. Crear el Token JWT
    const payload = { userId: newUser.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // 5. Responder al Frontend
    res.status(201).json({ 
      mensaje: 'Usuario creado exitosamente', 
      token, 
      user: { name: newUser.name, email: newUser.email } 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

// ----------------------------------------------------
// FUNCION 2: INICIAR SESIÓN (LOGIN)
// ----------------------------------------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Buscar al usuario
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // 2. Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // 3. Generar nuevo Token
    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ 
      mensaje: 'Login exitoso', 
      token, 
      user: { name: user.name, email: user.email } 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};