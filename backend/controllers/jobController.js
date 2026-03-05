import axios from 'axios';

const DEFAULT_QUERY = 'Junior Software Developer React Node';

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
  'recursos humanos': 'human resources', // frases primero (más largas)
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
  ' en ':         ' in ',       // preposición española → inglés (con espacios)
};

const translateQuery = (q) => {
  let result = q.toLowerCase();
  // Reemplaza de mayor a menor longitud para evitar solapamientos
  Object.entries(ES_EN)
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([es, en]) => { result = result.replace(new RegExp(es, 'gi'), en); });
  return result.trim();
};

// ── Wrapper JSearch ───────────────────────────────────────────────────────────
const jsearch = async (params) => {
  const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
    params: {
      page: '1',
      num_pages: '1',   // 10 resultados — 1 crédito, respuesta rápida
      ...params,
    },
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
    timeout: 20000,     // 20 s — JSearch puede tardar en el plan free
  });
  return response.data.data || [];
};

/**
 * GET /api/jobs/search
 * Query params: query (string), location (string)
 *
 * 1 llamada a JSearch — simple, estable, sin rate limit.
 * Query traducido al inglés + Colombia como contexto por defecto.
 */
export const searchJobs = async (req, res) => {
  const { query = DEFAULT_QUERY, location = '' } = req.query;
  const cacheKey = `${query}|${location}`.toLowerCase();

  // ── Caché hit ────────────────────────────────────────────────────────────
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[JobController] Cache HIT "${cacheKey}" → ${cached.length} ofertas`);
    return res.status(200).json({ jobs: cached, total: cached.length, cached: true });
  }

  // Traducir query al inglés para mejores resultados en JSearch
  const enQuery = translateQuery(query);
  // Añadir Colombia al query para priorizar resultados nacionales en beta
  const finalQuery = location
    ? `${enQuery} in ${location}`
    : `${enQuery} Colombia`;

  console.log(`[JobController] Buscando: "${finalQuery}"`);

  try {
    const jobs = await jsearch({ query: finalQuery, country: 'co' });

    // Etiquetar con scope para los tabs del frontend
    const tagged = jobs.map((job) => ({
      ...job,
      _scope: job.job_country?.toLowerCase().includes('colombia') ||
              job.job_city?.toLowerCase().includes('colombia')
        ? 'colombia' : 'internacional',
    }));

    console.log(`[JobController] "${finalQuery}" → ${tagged.length} ofertas`);
    setCache(cacheKey, tagged);
    return res.status(200).json({ jobs: tagged, total: tagged.length, cached: false });

  } catch (error) {
    const status  = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Error al obtener ofertas';
    console.error(`[JobController] Error [${status}]: ${message}`);
    return res.status(status).json({ error: message });
  }
};
