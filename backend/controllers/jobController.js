import axios from 'axios';
import User from '../models/User.js';

// ── Caché en memoria ──────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.jobs;
};
const setCache = (key, jobs) => cache.set(key, { jobs, expiresAt: Date.now() + CACHE_TTL_MS });

// ── Diccionario ES → EN para los términos más buscados ───────────────────────
const ES_EN = {
  // frases primero (orden importa: más largas tienen prioridad)
  'recursos humanos':  'human resources',
  'desarrollo web':    'web development',
  'desarrollo móvil':  'mobile development',
  'desarrollo movil':  'mobile development',
  'ciencia de datos':  'data science',
  'inteligencia artificial': 'artificial intelligence',
  'seguridad informática':   'cybersecurity',
  'seguridad informatica':   'cybersecurity',
  // palabras sueltas
  'diseñador':    'designer',   'diseñadora': 'designer',   'diseño':    'design',
  'gráfico':      'graphic',    'grafico':    'graphic',
  'técnico':      'technician', 'tecnico':    'technician',
  'sistemas':     'systems',
  'prácticas':    'internship', 'practicas':  'internship',
  'desarrollador':'developer',  'desarrolladora': 'developer',
  'programador':  'programmer', 'programadora':   'programmer',
  'ingeniero':    'engineer',   'ingeniería': 'engineering',
  'ventas':       'sales',      'contabilidad': 'accounting',
  'contador':     'accountant', 'administrador': 'administrator',
  'soporte':      'support',    'analista':   'analyst',
  'datos':        'data',       'redes':      'networking',
  'desarrollo':   'development','web':        'web',
  ' en ':         ' in ',
};

const translateQuery = (q) => {
  let result = q.toLowerCase();
  Object.entries(ES_EN)
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([es, en]) => { result = result.replace(new RegExp(es, 'gi'), en); });
  return result.trim();
};



// ── Ciudades / estados colombianos (para scope Colombia) ──────────────────────
const COLOMBIA_PLACES = new Set([
  'co', 'colombia',
  'bogotá', 'bogota', 'medellín', 'medellin', 'cali', 'barranquilla',
  'cartagena', 'bucaramanga', 'pereira', 'manizales', 'cúcuta', 'cucuta',
  'ibagué', 'ibague', 'neiva', 'villavicencio', 'santa marta', 'armenía',
  'armenia', 'pasto', 'montería', 'monteria', 'sincelejo', 'popayán', 'popayan',
  'tunja', 'florencia', 'quibdó', 'quibdo', 'riohacha', 'valledupar', 'leticia',
]);

const isColombiaJob = (job) => {
  const country = (job.job_country || '').toLowerCase().trim();
  const state   = (job.job_state   || '').toLowerCase();
  const city    = (job.job_city    || '').toLowerCase();
  return COLOMBIA_PLACES.has(country) ||
    [...COLOMBIA_PLACES].some(p => p.length > 2 && (city.includes(p) || state.includes(p)));
};

// ── Patrones de spam / MLM (post-filtro de calidad) ──────────────────────────
const SPAM_PATTERNS = [
  /myleadbiz/i,
  /free traffic/i,
  /earn.*\$\d+.*(day|hour|week)/i,
  /\$\d+\+?\s*(per|\/)\s*(day|hour)/i,
  /make money (online|fast)/i,
  /work from home.*commission only/i,
  /no experience.*earn.*\$/i,
  /passive income/i,
];

const isQualityJob = (job) => {
  const text = `${job.job_title || ''} ${(job.job_description || '').slice(0, 300)}`;
  return !SPAM_PATTERNS.some(p => p.test(text));
};

// ── Post-filtro estricto de experiencia ──────────────────────────────────────
/**
 * strictExperienceFilter(jobs, experienceLevel)
 *
 * Analiza título + descripción de cada oferta y descarta las que
 * pidan más experiencia de la que tiene el usuario.
 *
 * Niveles:
 *   'Sin experiencia' / 'Menos de 1 año'  → bloquea ≥2 años en texto + títulos senior/lead/etc.
 *   '1-3 años'                             → bloquea ≥5 años en texto + lead/principal/architect
 *   '3-5 años'                             → bloquea ≥10 años en texto
 *   'Más de 5 años'                        → sin restricción de texto
 */
const strictExperienceFilter = (jobs, experienceLevel) => {
  // Sin nivel definido → no filtramos
  if (!experienceLevel) return jobs;

  // ── Configuración por nivel ──────────────────────────────────────────────
  const config = {
    'Sin experiencia': {
      yearsRegex: /\b([2-9]|\d{2,})\s*\+?\s*(years?|años?)\s*(of\s+)?(experience|experiencia)?/i,
      blockedTitles: /\b(senior|sr\.?|lead|principal|architect|arquitecto|staff|manager|director|head\s+of)\b/i,
    },
    'Menos de 1 año': {
      yearsRegex: /\b([2-9]|\d{2,})\s*\+?\s*(years?|años?)\s*(of\s+)?(experience|experiencia)?/i,
      blockedTitles: /\b(senior|sr\.?|lead|principal|architect|arquitecto|staff|manager|director|head\s+of)\b/i,
    },
    '1-3 años': {
      yearsRegex: /\b([5-9]|\d{2,})\s*\+?\s*(years?|años?)\s*(of\s+)?(experience|experiencia)?/i,
      blockedTitles: /\b(lead|principal|architect|arquitecto|staff|director|head\s+of)\b/i,
    },
    '3-5 años': {
      yearsRegex: /\b(10|\d{2,})\s*\+?\s*(years?|años?)\s*(of\s+)?(experience|experiencia)?/i,
      blockedTitles: null,
    },
    'Más de 5 años': {
      yearsRegex: null,
      blockedTitles: null,
    },
  };

  const { yearsRegex, blockedTitles } = config[experienceLevel] || {};

  return jobs.filter((job) => {
    const title = job.job_title || '';
    // Revisar solo los primeros 1500 chars de la descripción (más rápido, cubre el bloque de requisitos)
    const desc  = (job.job_description || '').slice(0, 1500);

    // Bloquear por título (senior, lead, etc.)
    if (blockedTitles && blockedTitles.test(title)) return false;

    // Bloquear por años de experiencia mencionados en descripción
    if (yearsRegex && yearsRegex.test(desc)) return false;

    return true;
  });
};

// ── Wrapper JSearch ───────────────────────────────────────────────────────────
const jsearch = async (params) => {
  const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
    params: {
      page: '1',
      num_pages: '1',
      ...params,
    },
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
    timeout: 20000,
  });
  return response.data.data || [];
};

/**
 * GET /api/jobs/search
 * Query params: query (string), location (string)
 */
export const searchJobs = async (req, res) => {
  const { query = '', location = '' } = req.query;
  const userId = req.user?.userId;

  // ── Obtener perfil del usuario para personalizar la búsqueda ─────────────
  let userArea = '';
  let userExperienceLevel = '';

  if (userId) {
    try {
      const user = await User.findByPk(userId, { attributes: ['area', 'experienceLevel'] });
      if (user?.area) userArea = user.area;
      if (user?.experienceLevel) {
        userExperienceLevel = user.experienceLevel;
      }
    } catch (err) {
      console.warn('[JobController] No se pudo obtener perfil:', err.message);
    }
  }

  // ── Construir query final ─────────────────────────────────────────────────
  // Query limpio: solo puesto/área. El país va en el parámetro `country`.
  // Agregar palabras extra (Colombia, entry level) al texto reduce resultados.
  const baseQuery = query.trim() || userArea || 'software developer';
  let finalQuery  = translateQuery(baseQuery);

  // Solo añadir ubicación explícita si el usuario la escribió
  if (location.trim()) finalQuery += ` in ${location.trim()}`;

  const cacheKey = `${finalQuery}|${userExperienceLevel}`.toLowerCase();

  // ── Caché hit ─────────────────────────────────────────────────────────────
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[JobController] Cache HIT "${cacheKey}" → ${cached.length} ofertas`);
    return res.status(200).json({ jobs: cached, total: cached.length, cached: true, activeQuery: baseQuery });
  }

  // ── Parámetros para JSearch ───────────────────────────────────────────────
  // No usamos job_requirements: la mayoría de listings no rellena ese campo
  // y el filtro elimina demasiados resultados válidos. El post-filtro cubre esto.
  const jsearchParams = { query: finalQuery, country: 'co' };

  console.log(`[JobController] Buscando: "${finalQuery}" | nivel: ${userExperienceLevel || 'N/A'}`);

  try {
    const jobs = await jsearch(jsearchParams);

    // ── MODO DEMO: filtro estricto desactivado temporalmente ─────────────────
    // strictExperienceFilter() está implementado arriba y listo para producción.
    // Se desactiva aquí para garantizar volumen visual (≥10 resultados) en demo.
    // TODO: reactivar cuando se use una API premium con datos más consistentes:
    //   const sane = strictExperienceFilter(jobs.filter(isQualityJob), userExperienceLevel);
    const sane = jobs
      .filter(isQualityJob)
      .filter((j) => j.job_apply_link && j.job_title); // sanidad básica: enlace + título presentes

    const filtered = sane.slice(0, 10);

    const tagged = filtered.map((job) => ({
      ...job,
      _scope: isColombiaJob(job) ? 'colombia' : 'internacional',
    }));

    // Colombia primero, luego internacional, ambos ordenados por fecha
    tagged.sort((a, b) => {
      if (a._scope === b._scope) {
        return new Date(b.job_posted_at_datetime_utc || 0) - new Date(a.job_posted_at_datetime_utc || 0);
      }
      return a._scope === 'colombia' ? -1 : 1;
    });

    console.log(`[JobController] "${finalQuery}" → ${jobs.length} raw | ${tagged.length} tras filtros`);
    setCache(cacheKey, tagged);
    return res.status(200).json({ jobs: tagged, total: tagged.length, cached: false, activeQuery: baseQuery });

  } catch (error) {
    const status  = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Error al obtener ofertas';
    console.error(`[JobController] Error [${status}]: ${message}`);
    return res.status(status).json({ error: message });
  }
};
