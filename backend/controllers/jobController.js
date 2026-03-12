import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { enrichJobsWithMatchData } from '../services/jobMatchService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Caché en memoria ──────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 10 * 60 * 1000;

// Hint de nivel que se añade al query para mejorar la relevancia semántica
const QUERY_LEVEL_HINT = {
  'Sin experiencia':  'entry level',
  'Menos de 1 año':   'entry level',
  '1-3 años':         'junior',
  '3-5 años':         '',
  'Más de 5 años':    'senior',
};

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.rawJobs;
};
const setCache = (key, rawJobs) => cache.set(key, { rawJobs, expiresAt: Date.now() + CACHE_TTL_MS });

// ── Caché en disco para desarrollo (evita 429 durante hot-reload) ─────────────
// Solo activa cuando NODE_ENV === 'development'. Los JSON se guardan en backend/cache/.
const DEV_CACHE_DIR = path.resolve(__dirname, '../cache');
const sanitizeCacheKey = (key) => key.replace(/[^a-z0-9_\-.]/gi, '_').slice(0, 80);

const getDevCached = (key) => {
  if (process.env.NODE_ENV !== 'development') return null;
  try {
    const file = path.join(DEV_CACHE_DIR, `${sanitizeCacheKey(key)}.json`);
    if (!fs.existsSync(file)) return null;
    const { rawJobs, expiresAt } = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() > expiresAt) { fs.unlinkSync(file); return null; }
    return rawJobs;
  } catch { return null; }
};

const setDevCache = (key, rawJobs) => {
  if (process.env.NODE_ENV !== 'development') return;
  try {
    if (!fs.existsSync(DEV_CACHE_DIR)) fs.mkdirSync(DEV_CACHE_DIR, { recursive: true });
    const file = path.join(DEV_CACHE_DIR, `${sanitizeCacheKey(key)}.json`);
    fs.writeFileSync(file, JSON.stringify({ rawJobs, expiresAt: Date.now() + CACHE_TTL_MS }), 'utf8');
  } catch (err) {
    console.warn('[JobController] Dev cache write error:', err.message);
  }
};

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

// Palabras vacías que no aportan relevancia al comparar query vs título de empleo
const QUERY_STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'for', 'and', 'or', 'with', 'to', 'at',
  'entry', 'level', 'junior', 'senior', 'remote', 'job', 'jobs',
]);

// Filtra empleos cuyo título NO tiene ningún término del query.
// Evita que CareerJet/Jooble devuelvan resultados completamente fuera del tema.
const isQueryRelevant = (job, queryWords) => {
  if (queryWords.length === 0) return true;
  const titleLower = (job.job_title || '').toLowerCase();
  const descSnippet = (job.job_description || '').slice(0, 300).toLowerCase();
  return queryWords.some((w) => titleLower.includes(w) || descSnippet.includes(w));
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
    // El patrón yearsRegex busca explícitamente "X years of experience" (exige la palabra
    // experience/experiencia para no confundir con "10 years in business" u otras frases).
    // También captura "minimum X years" y "X+ years experience required".
    'Sin experiencia': {
      yearsRegex: /\b([2-9]|\d{2,})\s*\+?\s*(years?|años?)\s+(of\s+)?(experience|experiencia)\b|\b(minimum|min\.?|at least|requiere|mínimo|minimo)\s+([2-9]|\d{2,})\s*\+?\s*(years?|años?)/i,
      blockedTitles: /\b(senior|sr\.\s|lead|principal|architect|arquitecto|staff\s+engineer|manager|director|head\s+of)\b/i,
    },
    'Menos de 1 año': {
      yearsRegex: /\b([2-9]|\d{2,})\s*\+?\s*(years?|años?)\s+(of\s+)?(experience|experiencia)\b|\b(minimum|min\.?|at least|requiere|mínimo|minimo)\s+([2-9]|\d{2,})\s*\+?\s*(years?|años?)/i,
      blockedTitles: /\b(senior|sr\.\s|lead|principal|architect|arquitecto|staff\s+engineer|manager|director|head\s+of)\b/i,
    },
    '1-3 años': {
      yearsRegex: /\b([5-9]|\d{2,})\s*\+?\s*(years?|años?)\s+(of\s+)?(experience|experiencia)\b|\b(minimum|min\.?|at least|requiere|mínimo|minimo)\s+([5-9]|\d{2,})\s*\+?\s*(years?|años?)/i,
      blockedTitles: /\b(lead|principal|architect|arquitecto|staff\s+engineer|director|head\s+of)\b/i,
    },
    '3-5 años': {
      yearsRegex: /\b(1[0-9]|\d{3,})\s*\+?\s*(years?|años?)\s+(of\s+)?(experience|experiencia)\b/i,
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

    // Bloquear por años de experiencia REQUERIDOS en descripción
    // El regex debe coincidir con "X years of experience" o "minimum X years" — no con
    // frases genéricas como "our company has 10 years in business".
    if (yearsRegex && yearsRegex.test(desc)) return false;

    return true;
  });
};

// ── Wrapper Adzuna ────────────────────────────────────────────────────────────
// Documentación: https://developer.adzuna.com/activedocs#!/adzuna/search
// Países soportados: us, gb, au, ca, de, fr, br, mx, in, it, es, nl, pl, za, sg, at, be, nz, ru
// Usamos 'us' + 'gb' en paralelo para maximizar el pool de resultados angloparlantes
// accesibles de forma remota (perfil latinoamericano).
const fetchAdzuna = async (query, country = 'us', page = 1, resultsPerPage = 20) => {
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn('[JobController] Adzuna: ADZUNA_APP_ID o ADZUNA_APP_KEY no configurados.');
    return [];
  }

  // Forzamos "remote" en el query para que Adzuna solo devuelva posiciones
  // remotas — el usuario está en Colombia y no puede aplicar a empleos
  // presenciales de EE.UU. o UK (redirect_url region-bloqueada).
  const remoteQuery = `${query} remote`;

  const response = await axios.get(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`,
    {
      params: {
        app_id:           appId,
        app_key:          appKey,
        what:             remoteQuery,
        results_per_page: resultsPerPage,
        category:         'it-jobs',
      },
      timeout: 12000,
    }
  );

  const results = response.data?.results || [];
  // Normalizar al shape interno (mismo que usaba JSearch) para reutilizar
  // jobMatchService, isColombiaJob, strictExperienceFilter, etc. sin cambios.
  return results.map((j) => {
    const locationParts = (j.location?.display_name || '').split(',').map(s => s.trim());
    const jobCity    = locationParts.length > 1 ? locationParts[0] : null;
    const jobCountry = locationParts[locationParts.length - 1] || null;

    // Intentar obtener logo de empresa vía Clearbit (gratuito, sin key)
    const companySlug = (j.company?.display_name || '')
      .toLowerCase().replace(/[^a-z0-9]/g, '');
    const employerLogo = companySlug
      ? `https://logo.clearbit.com/${companySlug}.com`
      : null;

    // Normalizar contract_time → FULLTIME / PARTTIME / CONTRACTOR
    const contractMap = {
      full_time:   'FULLTIME',
      part_time:   'PARTTIME',
      contract:    'CONTRACTOR',
      temporary:   'CONTRACTOR',
    };

    return {
      job_id:                     `adzuna-${j.id}`,
      job_title:                  j.title || '',
      employer_name:              j.company?.display_name || '',
      employer_logo:              employerLogo,
      job_description:            (j.description || '').slice(0, 2000),
      job_apply_link:             j.redirect_url || '',
      job_employment_type:        contractMap[j.contract_time] || 'FULLTIME',
      job_city:                   jobCity,
      job_country:                jobCountry,
      job_state:                  null,
      job_posted_at_datetime_utc: j.created || null,
      job_min_salary:             j.salary_min || null,
      job_max_salary:             j.salary_max || null,
      job_salary_currency:        'USD',
      job_highlights:             {},
      job_required_experience:    null,
      _source:                    'adzuna',
      // Pre-taggear como remoto: al ser remote jobs son accesibles desde Colombia
      _scope:                     'remoto',
    };
  });
};

// ── Wrapper Remotive (API gratuita, sin API key) ───────────────────────────────
// Fuente complementaria de empleos remotos. Se usa como fallback si JSearch
// devuelve pocos resultados útiles tras el filtro de experiencia.
// ── Wrapper Jobicy (API gratuita, sin API key) ────────────────────────────────
// 100% empleos remotos. Docs: https://jobi.cy/apidocs
// Nota: GetOnBoard requiere autenticación (401) — no tiene API pública.
const fetchJobicy = async (query) => {
  try {
    // Jobicy usa 'tag' para búsqueda semántica; tomamos la primera palabra clave
    const tag = query.split(' ')[0];
    const response = await axios.get('https://jobicy.com/api/v2/remote-jobs', {
      params: { count: 15, tag },
      timeout: 8000,
    });
    const jobs = response.data?.jobs || [];
    return jobs.map((j) => ({
      job_id:                     `jobicy-${j.id}`,
      job_title:                  j.jobTitle?.replace(/&amp;/g, '&').replace(/&#\d+;/g, '') || '',
      employer_name:              j.companyName || '',
      employer_logo:              null, // Jobicy bloquea hotlinking (403 CORS) → fallback avatar
      job_description:            (j.jobDescription || '').replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').slice(0, 2000),
      job_apply_link:             j.url || '',
      job_employment_type:        (j.jobType?.[0] || 'Full-Time').toUpperCase().replace(/[-\s]/g, ''),
      job_city:                   null,
      job_country:                j.jobGeo || 'Worldwide',
      job_state:                  null,
      job_posted_at_datetime_utc: j.pubDate || null,
      job_min_salary:             j.salaryMin || null,
      job_max_salary:             j.salaryMax || null,
      job_salary_currency:        j.salaryCurrency || null,
      job_highlights:             {},
      job_required_experience:    null,
      _source:                    'jobicy',
      _scope:                     'remoto',
    }));
  } catch (err) {
    console.warn('[JobController] Jobicy no disponible:', err.message);
    return [];
  }
};

// ── Wrapper Jooble (fuente adicional de empleos remotos/globales) ─────────────
// NOTA: Jooble no indexa Colombia — se usa sin filtro de ubicación para ampliar
// el pool de empleos remotos globales.
const fetchJoobleJobs = async (query) => {
  const apiKey = process.env.JOOBLE_API_KEY;

  if (!apiKey) {
    console.warn('[JobController] Jooble: JOOBLE_API_KEY no configurada.');
    return [];
  }

  try {
    const response = await axios.post(
      `https://jooble.org/api/${apiKey}`,
      { keywords: `${query} remote`, resultonpage: 15 },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } },
    );

    const jobs = response.data?.jobs || [];
    return jobs.map((j, idx) => ({
      job_id:                     `jooble-${j.id || idx}-${Date.now()}`,
      job_title:                  (j.title || '').replace(/<[^>]+>/g, '').trim(),
      employer_name:              j.company || '',
      employer_logo:              null,
      job_description:            (j.snippet || '').replace(/<[^>]+>/g, ' ').slice(0, 2000),
      job_apply_link:             j.link || '',
      job_employment_type:        (j.type || 'Full-time').toUpperCase().replace(/[-\s]/g, ''),
      job_city:                   null,
      job_country:                j.location || null,
      job_state:                  null,
      job_posted_at_datetime_utc: j.updated || null,
      job_min_salary:             j.salary ? parseFloat(j.salary) || null : null,
      job_max_salary:             null,
      job_salary_currency:        'USD',
      job_highlights:             {},
      job_required_experience:    null,
      _source:                    'jooble',
      _scope:                     'remoto',
    }));
  } catch (err) {
    console.warn('[JobController] Jooble no disponible:', err.message);
    return [];
  }
};

// ── Wrapper CareerJet → empleos presenciales/híbridos en Colombia ────────────
// Docs: https://www.careerjet.com/partners/api
// Requiere: CAREERJET_AFFID (affiliate ID del publisher) + IP declarada en el panel.
// La API exige user_ip y user_agent del visitante original; al llamar desde el
// backend Node, pasamos la IP del servidor y un UA genérico de navegador.
const fetchCareerjetJobs = async (query, req) => {
  const affid = process.env.CAREERJET_AFFID;
  if (!affid) {
    console.warn('[JobController] CareerJet: CAREERJET_AFFID no configurado.');
    return [];
  }

  try {
    const userIp    = req?.ip || req?.headers?.['x-forwarded-for']?.split(',')[0] || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Mozilla/5.0';

    const response = await axios.get('http://public.api.careerjet.net/search', {
      params: {
        keywords:    query,
        location:    'Colombia',
        locale_code: 'es_CO',
        affid,
        page_size:   20,
        sort:        'date',
        user_ip:     userIp,
        user_agent:  userAgent,
      },
      headers:  { Referer: process.env.FRONTEND_URL || 'https://next-col.online' },
      timeout:  10000,
    });

    const jobs = response.data?.jobs || [];
    return jobs.map((j, idx) => {
      // location viene como "Ciudad, Departamento" — extraemos ciudad
      const locationParts = (j.locations || '').split(',').map(s => s.trim());
      const jobCity    = locationParts[0] || null;
      const jobState   = locationParts[1] || null;

      return {
        job_id:                     `careerjet-${idx}-${Date.now()}`,
        job_title:                  (j.title || '').replace(/<[^>]+>/g, '').trim(),
        employer_name:              j.company || '',
        employer_logo:              null,
        job_description:            (j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 2000),
        job_apply_link:             j.url || '',
        job_employment_type:        'FULLTIME',
        job_city:                   jobCity,
        job_country:                'Colombia',
        job_state:                  jobState,
        job_posted_at_datetime_utc: j.date || null,
        job_min_salary:             j.salary ? parseFloat(j.salary) || null : null,
        job_max_salary:             null,
        job_salary_currency:        'COP',
        job_highlights:             {},
        job_required_experience:    null,
        _source:                    'careerjet',
        _scope:                     'colombia',
      };
    });
  } catch (err) {
    console.warn('[JobController] CareerJet no disponible:', err.message);
    return [];
  }
};

const fetchRemotive = async (query) => {
  try {
    const response = await axios.get('https://remotive.com/api/remote-jobs', {
      params: { search: query, limit: 15 },
      timeout: 8000,
    });
    const jobs = response.data?.jobs || [];
    // Normalizar al shape de JSearch para reutilizar todos los filtros post-proceso
    return jobs.map((j) => ({
      job_id:                      `remotive-${j.id}`,
      job_title:                   j.title || '',
      employer_name:               j.company_name || '',
      employer_logo:               j.company_logo || null,
      job_description:             j.description?.replace(/<[^>]+>/g, ' ').slice(0, 2000) || '',
      job_apply_link:              j.url || '',
      job_employment_type:         (j.job_type || '').toUpperCase().replace('-', '') || 'FULLTIME',
      job_city:                    null,
      job_country:                 'Remote',
      job_state:                   null,
      job_posted_at_datetime_utc:  j.publication_date || null,
      job_min_salary:              null,
      job_max_salary:              null,
      job_salary_currency:         null,
      job_highlights:              {},
      job_required_experience:     null,
      _source:                     'remotive',
      _scope:                      'remoto',
    }));
  } catch (err) {
    console.warn('[JobController] Remotive no disponible:', err.message);
    return [];
  }
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
  let userProfile = null;

  if (userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['area', 'experienceLevel', 'skills', 'cvText'],
      });
      if (user?.area) userArea = user.area;
      if (user?.experienceLevel) {
        userExperienceLevel = user.experienceLevel;
      }
      userProfile = user;
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
  const cached = getCached(cacheKey) || getDevCached(cacheKey);
  if (cached) {
    const enrichedJobs = enrichJobsWithMatchData(cached, userProfile || {});
    enrichedJobs.sort((a, b) => {
      const scoreA = (a.matchAnalysis?.score ?? 0) + (a._scope === 'colombia' ? 5 : 0);
      const scoreB = (b.matchAnalysis?.score ?? 0) + (b._scope === 'colombia' ? 5 : 0);
      return scoreB - scoreA;
    });
    const top15 = enrichedJobs.slice(0, 15);
    console.log(`[JobController] Cache HIT "${cacheKey}" → ${top15.length} ofertas`);
    return res.status(200).json({ jobs: top15, total: top15.length, cached: true, activeQuery: baseQuery });
  }

  // ── Parámetros para Adzuna ────────────────────────────────────────────────
  const levelHint = QUERY_LEVEL_HINT[userExperienceLevel] || '';
  const enrichedQuery = levelHint ? `${finalQuery} ${levelHint}` : finalQuery;

  console.log(`[JobController] Buscando: "${enrichedQuery}" | nivel: ${userExperienceLevel || 'N/A'}`);

  try {
    // Adzuna US + GB + Remotive + Jobicy + Jooble + CareerJet en paralelo
    // US/GB: posiciones remotas accesibles desde Colombia
    // Remotive/Jobicy/Jooble: empleos remotos globales, sin API key
    // CareerJet: empleos presenciales/híbridos en Colombia
    const [adzunaUs, adzunaGb, remotiveJobs, jobicyJobs, joobleJobs, careerjetJobs] = await Promise.all([
      fetchAdzuna(enrichedQuery, 'us', 1, 20).catch((e) => {
        console.warn('[JobController] Adzuna US falló:', e.message);
        return [];
      }),
      fetchAdzuna(enrichedQuery, 'gb', 1, 10).catch((e) => {
        console.warn('[JobController] Adzuna GB falló:', e.message);
        return [];
      }),
      fetchRemotive(finalQuery),
      fetchJobicy(finalQuery),
      fetchJoobleJobs(finalQuery),
      fetchCareerjetJobs(finalQuery, req),
    ]);

    // Palabras clave del query (sin stop words) para filtro de relevancia
    const queryWords = finalQuery.toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !QUERY_STOP_WORDS.has(w));

    // ── Filtros de calidad ─────────────────────────────────────────────────────
    const raw = [...adzunaUs, ...adzunaGb, ...remotiveJobs, ...jobicyJobs, ...joobleJobs, ...careerjetJobs]
      .filter(isQualityJob)
      .filter((j) => j.job_apply_link && j.job_title)
      .filter((j) => isQueryRelevant(j, queryWords));

    // ── Deduplicación: mismo título + misma empresa → conservar el primero ────
    const dedupKey = (j) =>
      `${(j.job_title || '').toLowerCase().trim()}|${(j.employer_name || '').toLowerCase().trim()}`;
    const seen = new Set();
    const sane = raw.filter((j) => {
      const k = dedupKey(j);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // strictExperienceFilter aplica post-filtro por años solicitados en texto
    const afterExpFilter = strictExperienceFilter(sane, userExperienceLevel);

    // Si el filtro estricto dejó menos de 8 resultados, usamos el pool sin filtrar
    const pool = afterExpFilter.length >= 8 ? afterExpFilter : sane;

    const tagged = pool.map((job) => ({
      ...job,
      _scope: job._scope || (isColombiaJob(job) ? 'colombia' : 'internacional'),
    }));

    console.log(`[JobController] "${enrichedQuery}" → AdzunaUS:${adzunaUs.length} AdzunaGB:${adzunaGb.length} Remotive:${remotiveJobs.length} Jobicy:${jobicyJobs.length} Jooble:${joobleJobs.length} CareerJet:${careerjetJobs.length} | raw:${raw.length} dedup:${sane.length} | tras filtro exp:${afterExpFilter.length} | pool final:${tagged.length}`);
    setCache(cacheKey, tagged);
    setDevCache(cacheKey, tagged);

    // Enriquecer con match score y ordenar por score.
    // Los empleos colombianos reciben +5 pts de boost para competir con
    // los internacionales en el top 10 global.
    const enrichedJobs = enrichJobsWithMatchData(tagged, userProfile || {});
    enrichedJobs.sort((a, b) => {
      const scoreA = (a.matchAnalysis?.score ?? 0) + (a._scope === 'colombia' ? 5 : 0);
      const scoreB = (b.matchAnalysis?.score ?? 0) + (b._scope === 'colombia' ? 5 : 0);
      return scoreB - scoreA;
    });

    const top15 = enrichedJobs.slice(0, 15);
    return res.status(200).json({ jobs: top15, total: top15.length, cached: false, activeQuery: baseQuery });

  } catch (error) {
    const status  = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Error al obtener ofertas';
    console.error(`[JobController] Error [${status}]: ${message}`);
    return res.status(status).json({ error: message });
  }
};
