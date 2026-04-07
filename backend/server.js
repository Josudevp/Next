import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cron from 'node-cron';
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
import portfolioRoutes from './routes/portfolioRoutes.js';

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
const normalizeFrontendUrl = (url) => {
  if (!url) return null;
  // Quitar trailing slash si viene con él
  const clean = url.endsWith('/') ? url.slice(0, -1) : url;
  return clean.startsWith('http') ? clean : `https://${clean}`;
};

// [SECURITY FIX #5] Lista blanca explícita — sin wildcards de onrender.com.
// El regex anterior (/.*\.onrender\.com/) permitía que CUALQUIER app
// desplegada en Render hiciera peticiones cross-origin con credentials.
const allowedOrigins = [
  normalizeFrontendUrl(process.env.FRONTEND_URL),
  'http://localhost:5173',
  'http://localhost:4173',
  'https://next-col.online',
  'https://www.next-col.online',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // En desarrollo sin Origin (Postman, curl): permitir.
      // En producción esto es aceptable porque no hay credentials desde curl.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
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

// [SECURITY FIX #8] Límite global reducido a 100 KB.
// El endpoint de exportación de PDF (que necesita imágenes base64 grandes)
// aplica su propio límite de 10 MB directamente en su ruta.
app.use(express.json({ limit: '100kb' }));

// ── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/user', userRoutes);
app.use('/api/jobs', jobRoutes);      // Job Hunter
app.use('/api/cv', cvRoutes);         // CV Generator (save/load)
app.use('/api/export', exportRoutes); // Server-side PDF export via Puppeteer
app.use('/api/portfolio', portfolioRoutes); // Portfolio web generator

// ── Health checks para Render ─────────────────────────────────────────────────
// Render hace un GET periódico para verificar que el servicio está vivo.
// Exponemos dos rutas: / (raíz genérica) y /health (explícita y recomendada).
// [SECURITY FIX #7] Health checks sin info disclosure.
// No se expone NODE_ENV ni detalles de la app — solo el estado necesario para Render.
app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
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

  // ── Digest diario de vacantes ─────────────────────────────────────────────
  // 0 8 * * *  →  8:00 AM hora de Colombia
  // Solo activo en producción para evitar correos accidentales en local.
  if (process.env.NODE_ENV === 'production') {
    import('./services/hunterNotificationService.js').then(({ runHunterDigest }) => {
      cron.schedule('0 8 * * *', async () => {
        console.log('[digest] 🔔 Iniciando digest diario de vacantes...');
        try {
          await runHunterDigest();
          console.log('[digest] ✅ Digest completado.');
        } catch (err) {
          console.error('[digest] ❌ Error en el digest:', err.message);
        }
      }, { timezone: 'America/Bogota' });
      console.log('[digest] ⏰ Cron programado — 08:00 AM Colombia (America/Bogota) diario');
    });
  }
});

// Keep connections alive through Render's 60-second proxy timeout.
// headersTimeout must be > keepAliveTimeout to avoid race conditions.
server.keepAliveTimeout = 65_000;  // 65 s
server.headersTimeout   = 66_000;  // 66 s