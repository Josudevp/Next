import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';

const sendEmail = async ({ to, subject, html }) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'NEXT', email: process.env.EMAIL_USER },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al enviar correo: ${errorText}`);
  }
};

const normalizeUrl = (value) => {
  if (!value) return null;
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const isLocalUrl = (value) => {
  if (!value) return false;
  return value.includes('localhost') || value.includes('127.0.0.1');
};

const resolveFrontendUrl = (req) => {
  const resetFrontendUrl = normalizeUrl(process.env.PASSWORD_RESET_FRONTEND_URL);
  const envUrl = normalizeUrl(process.env.FRONTEND_URL);
  const requestOrigin = normalizeUrl(req.get('origin'));

  // 1) URL dedicada para recuperación (prioridad máxima)
  if (resetFrontendUrl && !isLocalUrl(resetFrontendUrl)) {
    return resetFrontendUrl;
  }

  // 2) Origen de la petición, si viene de frontend público
  if (requestOrigin && !isLocalUrl(requestOrigin)) {
    return requestOrigin;
  }

  // 3) FRONTEND_URL del entorno
  if (envUrl && !isLocalUrl(envUrl)) {
    return envUrl;
  }

  // 4) En producción nunca devolver localhost
  if (process.env.NODE_ENV === 'production') {
    return 'https://next-col.online';
  }

  return envUrl || requestOrigin || 'http://localhost:5173';
};

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
    const { email, password, rememberMe } = req.body;

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
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: rememberMe ? '30d' : '1d'
    });

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

// ----------------------------------------------------
// FUNCION 3: SOLICITAR RECUPERACIÓN DE CONTRASEÑA
// ----------------------------------------------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ mensaje: 'El correo es obligatorio' });
    }

    const user = await User.findOne({ where: { email: cleanEmail } });

    if (!user) {
      return res.status(404).json({ mensaje: 'No existe una cuenta asociada a ese correo.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    const frontendUrl = resolveFrontendUrl(req);
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER) {
      return res.status(500).json({ mensaje: 'El servicio de correo no está configurado.' });
    }

    await sendEmail({
      to: user.email,
      subject: 'Recuperación de contraseña - NEXT',
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Recupera tu contraseña</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en NEXT.</p>
          <p>
            Haz clic en el siguiente enlace para crear una nueva contraseña:
          </p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background: #2563EB; color: #FFFFFF; padding: 12px 20px; border-radius: 10px; text-decoration: none; display: inline-block; font-weight: 700;">
              Restablecer contraseña
            </a>
          </p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <p>Este enlace expirará en 1 hora.</p>
        </div>
      `,
    });

    return res.json({ mensaje: 'Revisa tu correo para continuar con la recuperación.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: 'No se pudo enviar el correo de recuperación. Intenta nuevamente.' });
  }
};

// ----------------------------------------------------
// FUNCION 4: RESTABLECER CONTRASEÑA
// ----------------------------------------------------
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ mensaje: 'La nueva contraseña es obligatoria' });
    }

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ mensaje: 'El enlace es inválido o ya expiró.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: 'No se pudo restablecer la contraseña.' });
  }
};