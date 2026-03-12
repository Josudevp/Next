import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { sendEmail } from '../services/emailService.js';

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
// FUNCION 5: LOGIN CON GOOGLE (Social Auth)
// ----------------------------------------------------
const fetchGoogleUser = async ({ credential, accessToken }) => {
  if (credential) {
    // ID-token flow: verify signature + claims via tokeninfo
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('ID token de Google inválido');
    const payload = await res.json();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) throw new Error('Token no emitido para esta aplicación');
    return payload;
  }
  if (accessToken) {
    // Access-token flow: fetch userinfo
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Access token de Google inválido');
    return res.json();
  }
  throw new Error('Token de Google requerido');
};

export const googleLogin = async (req, res) => {
  try {
    const { credential, accessToken } = req.body;
    if (!credential && !accessToken) {
      return res.status(400).json({ mensaje: 'Token de Google requerido' });
    }

    const googleUser = await fetchGoogleUser({ credential, accessToken });

    if (googleUser.email_verified !== true && googleUser.email_verified !== 'true') {
      return res.status(400).json({ mensaje: 'El correo de Google no está verificado' });
    }

    const email = googleUser.email?.toLowerCase().trim();
    if (!email) return res.status(400).json({ mensaje: 'No se pudo obtener el correo de Google' });

    let user = await User.findOne({ where: { email } });
    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        name: googleUser.name || email.split('@')[0],
        email,
        password: null,
        googleId: googleUser.sub,
        profilePicture: googleUser.picture || null,
      });
    } else if (!user.googleId) {
      user.googleId = googleUser.sub;
      if (!user.profilePicture && googleUser.picture) {
        user.profilePicture = googleUser.picture;
      }
      await user.save();
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    return res.json({
      mensaje: 'Login con Google exitoso',
      token,
      user: { name: user.name, email: user.email },
      isNewUser,
      needsOnboarding: !user.area,
    });
  } catch (error) {
    console.error('[googleLogin] Error:', error.message);
    return res.status(401).json({ mensaje: 'No se pudo autenticar con Google. Intenta de nuevo.' });
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