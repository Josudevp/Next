import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import sequelize from './config/db.js';
import './models/User.js';
import './models/Message.js'; // Registra el modelo y define la asociación User → Message
import { warmBrowser } from './services/browserPool.js';

// Rutas
import authRoutes from './routes/authRoutes.js';
import coachRoutes from './routes/coachRoutes.js';
import userRoutes from './routes/userRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import cvRoutes from './routes/cvRoutes.js';
import exportRoutes from './routes/exportRoutes.js';

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
const normalizeFrontendUrl = (url) => {
  if (!url) return null;
  // Quitar trailing slash si viene con él
  const clean = url.endsWith('/') ? url.slice(0, -1) : url;
  return clean.startsWith('http') ? clean : `https://${clean}`;
};

const allowedOrigins = [
  normalizeFrontendUrl(process.env.FRONTEND_URL),
  'http://localhost:5173',
  'http://localhost:4173',
  'https://next-col.online',
  'https://www.next-col.online',
  'https://next-backend-i6el.onrender.com',
].filter(Boolean);

// Regex de seguridad: acepta cualquier subdominio de onrender.com en caso
// de que el FRONTEND_URL no esté configurado o cambie de URL.
const ONRENDER_REGEX = /^https:\/\/.*\.onrender\.com$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman, curl, etc.
      if (allowedOrigins.includes(origin) || ONRENDER_REGEX.test(origin)) {
        return callback(null, true);
      }
      console.error(`[CORS] Bloqueado: ${origin} | Permitidos: ${allowedOrigins.join(', ')}`);
      return callback(new Error(`CORS bloqueado para el origen: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Gzip compression — reduces JSON/text API responses by 60-80%.
// Must be placed BEFORE routes and body parsers.
app.use(compression({ threshold: 1024 })); // only compress responses > 1 KB

// 10 MB limit to accommodate base64-encoded profile pictures in PDF export requests
app.use(express.json({ limit: '10mb' }));

// ── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/user', userRoutes);
app.use('/api/jobs', jobRoutes);      // Job Hunter
app.use('/api/cv', cvRoutes);         // CV Generator (save/load)
app.use('/api/export', exportRoutes); // Server-side PDF export via Puppeteer

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
  .sync({ alter: false })
  .then(() => console.log('✅ Tablas de NEXT sincronizadas'))
  .catch((err) => console.log('❌ Error al sincronizar:', err));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor de NEXT corriendo en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  // Warm up Chromium in the background so first PDF export is fast
  warmBrowser();
});

// Keep connections alive through Render's 60-second proxy timeout.
// headersTimeout must be > keepAliveTimeout to avoid race conditions.
server.keepAliveTimeout = 65_000;  // 65 s
server.headersTimeout   = 66_000;  // 66 s