import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import sequelize from './config/db.js';
import './models/User.js';
import './models/Message.js'; // Registra el modelo y define la asociación User → Message

// Rutas
import authRoutes from './routes/authRoutes.js';
import coachRoutes from './routes/coachRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
// render.yaml inyecta FRONTEND_URL via property:url (incluye https://).
// La normalización defensiva cubre el caso de que venga sin protocolo.
const normalizeFrontendUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `https://${url}`;
};

const allowedOrigins = [
  normalizeFrontendUrl(process.env.FRONTEND_URL),
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origin (Postman, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS bloqueado para el origen: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/user', userRoutes);

// ── Health checks para Render ─────────────────────────────────────────────────
// Render hace un GET periódico para verificar que el servicio está vivo.
// Exponemos dos rutas: / (raíz genérica) y /health (explícita y recomendada).
app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', app: 'NEXT Backend', env: process.env.NODE_ENV });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    app: 'NEXT Backend',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── Sincronización con la BD y arranque ──────────────────────────────────────
sequelize
  .sync({ alter: true })
  .then(() => console.log('✅ Tablas de NEXT sincronizadas'))
  .catch((err) => console.log('❌ Error al sincronizar:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de NEXT corriendo en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});