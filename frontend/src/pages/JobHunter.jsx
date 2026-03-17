import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Briefcase, Search, MapPin, ExternalLink, RefreshCw,
  ArrowLeft, Clock, Building2, ChevronRight, AlertCircle, Wifi
} from 'lucide-react'
import axiosInstance from '../api/axiosInstance'
import LogoNext from '../components/LogoNext'
import Seo from '../components/Seo'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (dateStr) => {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7) return `Hace ${diff} días`
  if (diff < 30) return `Hace ${Math.floor(diff / 7)} semanas`
  return `Hace ${Math.floor(diff / 30)} meses`
}

const formatSalary = (min, max, currency) => {
  if (!min && !max) return null
  const fmt = (n) => n ? `${currency || 'USD'} ${Number(n).toLocaleString()}` : null
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  return fmt(min) || fmt(max)
}

const employmentTypeBadge = {
  FULLTIME: { label: 'Tiempo completo', color: 'text-green-600 bg-green-50 border-green-100' },
  PARTTIME: { label: 'Medio tiempo', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  CONTRACTOR: { label: 'Freelance', color: 'text-purple-600 bg-purple-50 border-purple-100' },
  INTERN: { label: 'Pasantía', color: 'text-blue-600 bg-blue-50 border-blue-100' },
}

const scopeBadge = {
  internacional: { label: '🌐 Internacional', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  colombia:      { label: '🇨🇴 Colombia',      color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  remoto:        { label: '🏠 Remoto',          color: 'text-teal-600 bg-teal-50 border-teal-100' },
}

const matchBadge = {
  alto: {
    label: 'Match alto',
    shell: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    progress: 'from-emerald-500 to-teal-500',
  },
  medio: {
    label: 'Match medio',
    shell: 'border-amber-200 bg-amber-50 text-amber-700',
    progress: 'from-amber-500 to-orange-500',
  },
  bajo: {
    label: 'Match bajo',
    shell: 'border-rose-200 bg-rose-50 text-rose-700',
    progress: 'from-rose-500 to-pink-500',
  },
}

// ─── Componente: Tarjeta de empleo ────────────────────────────────────────────
const JobCard = ({ job }) => {
  const navigate = useNavigate()
  const [imageError, setImageError] = useState(false)
  const badge = employmentTypeBadge[job.job_employment_type] || null
  const scope = scopeBadge[job._scope] || null
  const salary = formatSalary(job.job_min_salary, job.job_max_salary, job.job_salary_currency)
  const posted = timeAgo(job.job_posted_at_datetime_utc)
  const location = [job.job_city, job.job_country].filter(Boolean).join(', ')
  const match = job.matchAnalysis || null
  const matchTone = matchBadge[match?.band] || matchBadge.medio
  const isCapped = match?.experienceCapped || false
  const topMissing = match?.missingSkills?.slice(0, 3) || []
  const topStrengths = isCapped ? [] : (match?.strengths?.slice(0, 3) || [])
  const topResources = match?.resources?.slice(0, 2) || []

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 hover:border-purple-200 hover:shadow-[0_4px_20px_rgba(139,92,246,0.1)] transition-all duration-200 flex flex-col gap-4">

      {/* Header: logo + empresa + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo o fallback con inicial */}
          {job.employer_logo && !imageError ? (
            <img
              src={job.employer_logo}
              alt={job.employer_name}
              className="w-11 h-11 rounded-xl object-contain border border-gray-100 bg-white shrink-0 p-0.5"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-purple-100 to-violet-100 border border-purple-100 flex items-center justify-center shrink-0">
              <span className="text-purple-600 font-bold text-sm">
                {job.employer_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
              <Building2 size={11} /> {job.employer_name || 'Empresa'}
            </p>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">
              {job.job_title}
            </h3>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {match && (
            <div className={`min-w-26 rounded-2xl border px-3 py-2 ${matchTone.shell}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">IA Match</span>
                <span className="text-lg font-black leading-none">{match.score}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/70 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-linear-to-r ${matchTone.progress}`}
                  style={{ width: `${match.score}%` }}
                />
              </div>
            </div>
          )}
          {scope && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${scope.color}`}>
              {scope.label}
            </span>
          )}
          {badge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Meta: ubicación + salario */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {location && (
          <span className="flex items-center gap-1">
            <MapPin size={11} className="text-gray-400" /> {location}
          </span>
        )}
        {salary && (
          <span className="flex items-center gap-1 font-semibold text-next-success">
            💰 {salary}
          </span>
        )}
        {posted && (
          <span className="flex items-center gap-1 ml-auto">
            <Clock size={11} className="text-gray-300" /> {posted}
          </span>
        )}
      </div>

      {/* Descripción (overflow truncado) */}
      {job.job_description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 wrap-break-word">
          {job.job_description.replace(/\n+/g, ' ').trim()}
        </p>
      )}

      {match && (
        <section className={`rounded-2xl border p-3.5 space-y-3 ${
          isCapped
            ? 'border-rose-200 bg-rose-50/70'
            : 'border-slate-200 bg-slate-50/80'
        }`}>
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isCapped ? 'text-rose-400' : 'text-slate-400'}`} />
            <p className={`text-xs leading-relaxed ${isCapped ? 'text-rose-700 font-medium' : 'text-slate-600'}`}>
              {match.summary}
            </p>
          </div>

          {topStrengths.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topStrengths.map((skill) => (
                <span
                  key={`${job.job_id}-strength-${skill}`}
                  className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                >
                  Fuerte en {skill}
                </span>
              ))}
            </div>
          )}

          {topMissing.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">Gaps detectados</p>
              <div className="flex flex-wrap gap-1.5">
                {topMissing.map((skill) => (
                  <span
                    key={`${job.job_id}-gap-${skill}`}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
                  >
                    Falta {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {topResources.length > 0 && (
            <div className="space-y-1.5">
              {topResources.map((resource) => (
                <a
                  key={`${job.job_id}-resource-${resource.skill}`}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-purple-200 hover:text-purple-700"
                >
                  <span>Aprende {resource.skill} con {resource.title}</span>
                  <ChevronRight size={14} />
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CTA */}
      <div className="mt-auto flex gap-2">
        <a
          href={job.job_apply_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(to right, #7C3AED, #8B5CF6)' }}
        >
          Ver oferta <ExternalLink size={13} />
        </a>
        <button
          onClick={() => {
            const location = [job.job_city, job.job_country].filter(Boolean).join(', ') || 'No especificada';
            const gaps = job.matchAnalysis?.missingSkills?.slice(0, 3) || [];
            const descSnippet = (job.job_description || '').replace(/\n+/g, ' ').trim().slice(0, 400);

            // Prompt breve, orientado a perfil junior. Sin subtareas numeradas para
            // evitar que la IA genere una respuesta de 5 secciones largas.
            const lines = [
              `Quiero prepararme para esta vacante (soy un candidato con poca experiencia):`,
              `**Cargo:** ${job.job_title || 'No especificado'} — **Empresa:** ${job.employer_name || 'No especificada'} — **Ubicación:** ${location}`,
              descSnippet ? `**Descripción breve:** ${descSnippet}` : null,
              gaps.length > 0 ? `**Habilidades que me faltan según el análisis:** ${gaps.join(', ')}` : null,
              ``,
              `Dame un consejo práctico y directo (máximo 3 puntos cortos): qué destacar, qué pregunta clave preparar y cómo suplir mis brechas. Sin introducciones largas.`,
            ].filter(Boolean).join('\n');

            navigate('/ia-coach', { state: { jobPrep: { ...job, _processedPrompt: lines } } });
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#7C3AED] border-2 border-purple-200 bg-purple-50 transition-all hover:bg-purple-100 hover:border-purple-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          🎯 Prepararme
        </button>
      </div>
    </article>
  )
}

// ─── Componente: Estado vacío ─────────────────────────────────────────────────
const EmptyState = ({ query, onReset }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-4">
    <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center">
      <Briefcase size={28} className="text-purple-300" />
    </div>
    <div>
      <p className="font-semibold text-gray-700">Sin resultados para "{query}"</p>
      <p className="text-sm text-gray-400 mt-1">Intenta con otras palabras o cambia la ubicación</p>
    </div>
    <button
      onClick={onReset}
      className="text-sm font-semibold text-purple-600 hover:text-purple-800 underline underline-offset-2 cursor-pointer"
    >
      Volver a la búsqueda por defecto
    </button>
  </div>
)

// ─── Componente: Estado de error ──────────────────────────────────────────────
const ErrorState = ({ message, onRetry }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-4">
    <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
      <Wifi size={28} className="text-red-300" />
    </div>
    <div>
      <p className="font-semibold text-gray-700">Error al cargar vacantes</p>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">{message}</p>
    </div>
    <button
      onClick={onRetry}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all hover:opacity-90"
      style={{ background: 'linear-gradient(to right, #7C3AED, #8B5CF6)' }}
    >
      <RefreshCw size={13} /> Reintentar
    </button>
  </div>
)

// ─── Skeletons de carga ───────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-2/3" />
        <div className="h-4 bg-gray-100 rounded-full w-full" />
      </div>
    </div>
    <div className="flex gap-3">
      <div className="h-3 bg-gray-100 rounded-full w-24" />
      <div className="h-3 bg-gray-100 rounded-full w-20" />
    </div>
    <div className="space-y-1.5">
      <div className="h-3 bg-gray-100 rounded-full w-full" />
      <div className="h-3 bg-gray-100 rounded-full w-5/6" />
      <div className="h-3 bg-gray-100 rounded-full w-4/6" />
    </div>
    <div className="h-9 bg-gray-100 rounded-xl w-full" />
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_QUERY = 'Junior Software Developer React Node'
const SKELETON_COUNT = 9
const FILTER_TABS = [
  { key: 'todas',         label: 'Todas' },
  { key: 'colombia',      label: '🇨🇴 Colombia' },
  { key: 'internacional', label: '🌐 Internacional' },
  { key: 'remoto',        label: '🏠 Remoto' },
]

const JobHunter = () => {
  const navigate = useNavigate()

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('todas')
  const [isCached, setIsCached] = useState(false)

  // Campos controlados del formulario
  const [inputQuery, setInputQuery] = useState('')
  const [inputLocation, setInputLocation] = useState('')

  // Valores activos de la última búsqueda (para el label de resultados)
  const [activeQuery, setActiveQuery] = useState(DEFAULT_QUERY)

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('next_token')
    const session = localStorage.getItem('next_session')
    if (!token || !session) navigate('/login', { replace: true })
  }, [navigate])

  // ── Llamada a la API ────────────────────────────────────────────────────
  const fetchJobs = useCallback(async (query = '', location = '') => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (query.trim()) params.query = query.trim()
      if (location.trim()) params.location = location.trim()

      const { data } = await axiosInstance.get('/jobs/search', { params })
      setJobs(data.jobs || [])
      setIsCached(data.cached || false)
      setActiveQuery(data.activeQuery || query.trim() || DEFAULT_QUERY)
    } catch (err) {
      const msg = err.response?.data?.error || 'No se pudo conectar con el servidor. Verifica tu conexión.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial con query por defecto
  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Jobs filtrados por tab activo
  const filteredJobs = activeFilter === 'todas'
    ? jobs
    : jobs.filter((j) => j._scope === activeFilter)

  // ── Manejadores ─────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault()
    setActiveFilter('todas')
    fetchJobs(inputQuery, inputLocation)
  }

  const handleReset = () => {
    setInputQuery('')
    setInputLocation('')
    setActiveFilter('todas')
    fetchJobs()
  }

  return (
    <div className="min-h-screen bg-next-gray">
      <Seo
        title="Job Hunter | Vacantes con IA | Next Job Hunter"
        description="Explora vacantes filtradas con IA dentro de Next Job Hunter."
        path="/job-hunter"
        robots="noindex, nofollow"
      />

      {/* ════════════════ NAV ════════════════ */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="text-gray-200 select-none">/</span>
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-[#8B5CF6]" />
            <span className="text-sm font-semibold text-gray-800">Job Hunter</span>
          </div>
          <div className="ml-auto">
            <LogoNext to="/dashboard" />
          </div>
        </div>
      </nav>

      {/* ════════════════ HERO HEADER ════════════════ */}
      <header
        className="py-10 px-4"
        style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 50%, #8B5CF6 100%)' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-1.5 mb-4 backdrop-blur-sm">
            <Briefcase size={13} className="text-purple-200" />
            <span className="text-white text-xs font-semibold tracking-wide uppercase">Vacantes en tiempo real</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
            Encuentra tu próximo trabajo
          </h1>
          <p className="text-purple-200 text-sm sm:text-base max-w-xl mx-auto">
            Empleos remotos vía <strong className="text-white">Adzuna</strong> · <strong className="text-white">Remotive</strong> · <strong className="text-white">Jobicy</strong> — y empleos en Colombia vía <strong className="text-white">CareerJet</strong>.
          </p>
        </div>
      </header>

      {/* ════════════════ BUSCADOR ════════════════ */}
      <div className="max-w-3xl mx-auto px-4 -mt-6">
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] border border-gray-100 p-4 flex flex-col sm:flex-row gap-3"
        >
          {/* Campo: puesto */}
          <div className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Puesto o tecnología…"
              className="bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none w-full"
            />
          </div>

          {/* Campo: ubicación */}
          <div className="flex items-center gap-2 w-full sm:w-44 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
            <MapPin size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={inputLocation}
              onChange={(e) => setInputLocation(e.target.value)}
              placeholder="Ubicación…"
              className="bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shrink-0"
            style={{ background: 'linear-gradient(to right, #7C3AED, #8B5CF6)' }}
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Search size={14} />
            }
            Buscar
          </button>
        </form>
      </div>

      {/* ════════════════ FILTROS + RESULTADOS ════════════════ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Tabs de filtro */}
        {!loading && !error && jobs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {FILTER_TABS.map((tab) => {
              const count = tab.key === 'todas'
                ? jobs.length
                : jobs.filter((j) => j._scope === tab.key).length
              const isActive = activeFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  disabled={count === 0 && tab.key !== 'todas'}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{count}</span>
                </button>
              )
            })}
            <button
              onClick={handleReset}
              className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-600 transition-colors cursor-pointer"
            >
              <RefreshCw size={11} /> Restablecer
            </button>
          </div>
        )}

        {/* Label de resultados */}
        {!loading && !error && filteredJobs.length > 0 && (
          <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
            <span className="font-semibold text-gray-800">{filteredJobs.length} ofertas</span>
            {' '}para{' '}
            <span className="text-purple-600 font-semibold">"{activeQuery}"</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              con IA de compatibilidad
            </span>
            {isCached && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                ⚡ desde caché
              </span>
            )}
          </p>
        )}

        {/* Mensaje de carga */}
        {loading && (
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin inline-block" />
            Consultando bolsas colombianas · LinkedIn · Indeed…
          </p>
        )}

        {/* Grid de tarjetas / estados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading && Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonCard key={i} />)}

          {!loading && error && (
            <ErrorState message={error} onRetry={() => fetchJobs(inputQuery, inputLocation)} />
          )}

          {!loading && !error && filteredJobs.length === 0 && (
            <EmptyState query={activeQuery} onReset={handleReset} />
          )}

          {!loading && !error && filteredJobs.map((job) => (
            <JobCard key={job.job_id} job={job} />
          ))}
        </div>
      </main>

      {/* ════════════════ FOOTER MÍNIMO ════════════════ */}
      <footer className="border-t border-gray-100 py-6 mt-4">
        <p className="text-center text-xs text-gray-400">
          Ofertas agregadas vía{' '}
          <a href="https://www.adzuna.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">
            Adzuna
          </a>
          {' · '}
          <a href="https://remotive.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">
            Remotive
          </a>
          {' · '}
          <a href="https://jobicy.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">
            Jobicy
          </a>
          {' — empleos remotos globales accesibles desde Colombia. '}
          NEXT no se responsabiliza por el contenido de las ofertas externas.
        </p>
      </footer>
    </div>
  )
}

export default JobHunter
