import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API_URL from '../api/api'
import {
  Bell, ChevronRight, Bot,
  Briefcase, TrendingUp, LogOut, User as UserIcon, HelpCircle, FileText, Globe
} from 'lucide-react'
import LogoNext from '../components/LogoNext'
import axiosInstance from '../api/axiosInstance'
import Seo from '../components/Seo'
import {
  getStoredUser,
  mergeStoredUser,
  SESSION_USER_UPDATED_EVENT,
} from '../utils/sessionUser'

const hasCompletedOnboarding = (profile) => {
  const skillsCount = Array.isArray(profile?.skills) ? profile.skills.length : 0
  const goalsCount = Array.isArray(profile?.goals) ? profile.goals.length : 0

  return Boolean(profile?.area && profile?.jobType && skillsCount > 0 && goalsCount > 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// (El Score ahora se consume enteramente desde MySQL backend)
// ─────────────────────────────────────────────────────────────────────────────
const CircularProgress = ({ percentage }) => {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (percentage / 100) * circ

  return (
    <svg width="110" height="110" viewBox="0 0 100 100" className="shrink-0">
      <defs>
        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1B49AE" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      {/* Progress */}
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke="url(#scoreGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
      />
      {/* Texto porcentaje */}
      <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: '18px', fontWeight: '800', fill: '#1E40AF' }}>
        {percentage}%
      </text>
      <text x="50" y="60" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: '8px', fill: '#94A3B8' }}>
        Score
      </text>
    </svg>
  )
}

// ─── Avatar con iniciales ─────────────────────────────────────────────────────
const UserAvatar = ({ name, onLogout, onGoToProfile }) => {
  const [open, setOpen] = useState(false)
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0].toUpperCase())
    .slice(0, 2)
    .join('')

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 rounded-full bg-linear-to-br from-[#1B49AE] to-next-secondary flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
        aria-label="Menú de usuario"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/60 py-2 w-48 z-50 animate-fade-in">
          <div className="px-4 py-2 border-b border-gray-50 mb-1">
            <p className="text-xs text-gray-400 font-medium truncate">Sesión de</p>
            <p className="text-sm text-gray-800 font-bold truncate">{name}</p>
          </div>

          <button
            onClick={() => { onGoToProfile(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <UserIcon size={14} /> Mi Perfil
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer border-t border-gray-50 mt-1"
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tarjeta de acción de crecimiento ─────────────────────────────────────────
const GrowthItem = ({ label, boost, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-100 bg-white hover:border-next-primary/30 hover:bg-blue-50/40 transition-all duration-150 cursor-pointer group"
  >
    <span className="text-sm text-gray-700 font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-next-success bg-green-50 px-2 py-0.5 rounded-full">{boost}</span>
      <ChevronRight size={14} className="text-gray-300 group-hover:text-next-primary transition-colors" />
    </div>
  </button>
)

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard principal
// ─────────────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [score, setScore] = useState(0)
  const [animatedScore, setAnimatedScore] = useState(0)
  const [loadError, setLoadError] = useState(false)

  // ── Auth guard + carga de datos remotos ──────────────────────────────────
  const loadProfile = async () => {
    setLoadError(false)
    const session = localStorage.getItem('next_session')
    const token = localStorage.getItem('next_token')
    const storedUser = getStoredUser()
    const cachedProfile = JSON.parse(localStorage.getItem('next_profile') || 'null')
    const onboardingCompleted = localStorage.getItem('next_onboarding_completed') === 'true'

    if (!session || !token || !storedUser) {
      navigate('/login', { replace: true })
      return
    }

    setUser(storedUser)

    try {
      const response = await axiosInstance.get('/user/profile', { timeout: 15000 })
      const dbProfile = response.data
      const syncedUser = mergeStoredUser({
        name: dbProfile.name || storedUser?.name || 'Usuario',
        email: dbProfile.email || storedUser?.email || '',
        profilePicture: dbProfile.profilePicture || null,
      })

      if (hasCompletedOnboarding(dbProfile)) {
        localStorage.setItem('next_onboarding_completed', 'true')
        localStorage.setItem('next_profile', JSON.stringify({
          area: dbProfile.area,
          jobType: dbProfile.jobType,
          skills: dbProfile.skills,
          goals: dbProfile.goals,
        }))
      } else {
        localStorage.removeItem('next_onboarding_completed')
        localStorage.removeItem('next_profile')
        navigate('/onboarding', { replace: true })
        return
      }

      setUser(syncedUser)
      setProfile(dbProfile)
      setScore(dbProfile.score || 0)

    } catch (error) {
      console.error('Error fetching DB profile:', error)

      if (cachedProfile && onboardingCompleted) {
        setProfile({
          score: 0,
          area: cachedProfile.area || '',
          skills: Array.isArray(cachedProfile.skills) ? cachedProfile.skills : [],
          goals: Array.isArray(cachedProfile.goals) ? cachedProfile.goals : [],
          jobType: cachedProfile.jobType || '',
          experienceLevel: 'Sin experiencia',
          profilePicture: null,
          hasCv: false,
        })
        setScore(0)
        return
      }

      // No hay caché: mostrar error con opción de reintentar
      setLoadError(true)
    }
  }

  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      await loadProfile()
    }
    checkAuthAndFetchProfile()
  }, [navigate])

  useEffect(() => {
    const handleUserUpdate = (event) => {
      if (event.detail) {
        setUser(event.detail)
      }
    }

    window.addEventListener(SESSION_USER_UPDATED_EVENT, handleUserUpdate)
    return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, handleUserUpdate)
  }, [])

  // ── Animación dinámica del score (tanto al subir como al bajar) ──────────
  useEffect(() => {
    // Almacenamos el valor actual en este render específico
    let currentVal = animatedScore
    const targetVal = score

    if (currentVal === targetVal) return

    const timer = setInterval(() => {
      if (currentVal === targetVal) {
        clearInterval(timer)
        return
      }

      const diff = targetVal - currentVal
      // Paso adaptativo: avanza rápido si está lejos, y de a 1 si está cerca
      const step = Math.max(1, Math.floor(Math.abs(diff) / 10))

      currentVal = diff > 0
        ? Math.min(currentVal + step, targetVal)
        : Math.max(currentVal - step, targetVal)

      setAnimatedScore(currentVal)
    }, 25)

    return () => clearInterval(timer)
    // Se ignora 'animatedScore' en las dependencias intencionalmente para 
    // que solo reinicie el trigger al cambiar el 'score' final.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score])

  const handleLogout = () => {
    // Para el backend: DELETE /api/auth/session (invalidar JWT)
    // next_user y next_profile NO se borran — son datos de cuenta, no de sesión
    localStorage.removeItem('next_session')
    navigate('/', { replace: true })
  }

  // Guard de render — espera datos
  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="text-center space-y-4">
          <p className="text-gray-500 text-sm">No se pudo cargar tu perfil. El servidor puede estar iniciando.</p>
          <button
            onClick={loadProfile}
            className="px-5 py-2.5 bg-next-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Reintentar
          </button>
          <div>
            <button
              onClick={() => { localStorage.clear(); navigate('/login', { replace: true }) }}
              className="text-xs text-gray-400 underline cursor-pointer"
            >
              Volver al login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 12h4a8 8 0 01-8 8z" />
          </svg>
          Cargando tu perfil...
        </div>
      </div>
    )
  }

  const displayName = profile?.name || user?.name || 'Usuario'
  const firstName = displayName ? displayName.split(' ')[0] : 'Usuario'
  const skillsArray = profile?.skills || []

  return (
    <div className="min-h-screen bg-next-gray">
      <Seo
        title={`Dashboard | ${displayName} | Next Job Hunter`}
        description="Panel privado de Next Job Hunter para gestionar tu perfil, CV y herramientas de empleabilidad."
        path="/dashboard"
        robots="noindex, nofollow"
      />

      {/* ════════════════════════════════════════════════════
                NAV — Logo + Acciones
            ════════════════════════════════════════════════════ */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          <LogoNext />
          <div className="flex items-center gap-3">
            {/* Notificaciones — estático para Beta */}
            <button
              aria-label="Notificaciones"
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-next-primary rounded-full ring-2 ring-white" />
            </button>

            <UserAvatar
              name={displayName}
              onLogout={handleLogout}
              onGoToProfile={() => navigate('/profile')}
            />
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════
                CONTENIDO PRINCIPAL
            ════════════════════════════════════════════════════ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── SALUDO ──────────────────────────────────── */}
        <section className="animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Hola, {firstName} 👋
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            {profile.area || profile.jobType || 'Área no definida'}
          </p>

          {/* Tags de habilidades seleccionadas */}
          {skillsArray.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {skillsArray.slice(0, 6).map(skill => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-next-primary border border-blue-100"
                >
                  {skill}
                </span>
              ))}
              {skillsArray.length > 6 && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  +{skillsArray.length - 6} más
                </span>
              )}
            </div>
          )}
        </section>

        {/* ── FILA 1: Score + Crece ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Tarjeta: Nivel de empleabilidad */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] animate-fade-in-up">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-bold text-gray-900">Nivel de empleabilidad</h2>
              <button className="flex items-center gap-1 text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1 hover:border-next-primary hover:text-next-primary transition-all cursor-pointer">
                <HelpCircleIcon /> ¿Cómo se calcula?
              </button>
            </div>

            <div className="flex items-center gap-5">
              <CircularProgress percentage={animatedScore} />
              <div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Basado en tu perfil,{' '}
                  <span className="font-semibold text-gray-700">{profile.skills?.length || 0} habilidades</span>{' '}
                  y tus metas laborales.
                </p>
                <div className="flex items-center gap-1.5 mt-3">
                  <TrendingUp size={13} className="text-next-success" />
                  <span className="text-xs text-next-success font-semibold">
                    {score < 60 ? 'En construcción' : score < 80 ? 'Perfil competitivo' : '¡Perfil destacado!'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta: CV Maker */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4 animate-fade-in-up">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText size={18} className="text-next-success" />
                <h2 className="font-bold text-gray-900">CV Maker</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Genera tu CV profesional con la ayuda de la IA de NEXT.
              </p>
              <Link
                to="/coach?mode=createcv&templateId=francisco"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(to right, #059669, #10B981)' }}
              >
                Crear CV <ChevronRight size={14} />
              </Link>
            </div>

            <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-100 items-center justify-center shrink-0">
              <FileText size={38} className="text-next-success opacity-80" />
            </div>
          </div>
        </div>

        {/* ── FILA 2: IA Coach + Job Hunter ───────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* IA Coach */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4 animate-fade-in-up">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Bot size={18} className="text-next-primary" />
                <h2 className="font-bold text-gray-900">IA Coach</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Mejora o crea tu Hoja de Vida con la ayuda de la IA de NEXT.
              </p>
              <Link
                to="/ia-coach"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(to right, #1B49AE, #2563EB)' }}
              >
                Ir a IA Coach <ChevronRight size={14} />
              </Link>
            </div>

            {/* Ilustración del robot */}
            <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-linear-to-br from-blue-50 to-cyan-50 border border-blue-100 items-center justify-center shrink-0">
              <Bot size={38} className="text-next-primary opacity-80" />
            </div>
          </div>

          {/* Job Hunter */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4 animate-fade-in-up">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Briefcase size={18} className="text-[#8B5CF6]" />
                <h2 className="font-bold text-gray-900">Job Hunter</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Vacantes hechas para ti, no trabajos al azar.
              </p>
              <Link
                to="/job-hunter"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(to right, #7C3AED, #8B5CF6)' }}
              >
                Explorar Vacantes <ChevronRight size={14} />
              </Link>
            </div>

            <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-linear-to-br from-purple-50 to-violet-50 border border-purple-100 items-center justify-center shrink-0">
              <Briefcase size={38} className="text-[#8B5CF6] opacity-80" />
            </div>
          </div>
        </div>

        {/* ── Portfolio Web Banner ───────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4 animate-fade-in-up">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] items-center justify-center shrink-0">
              <Globe size={22} className="text-next-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm mb-0.5">Portfolio Web — Nuevo</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Convierte tu CV en una landing page profesional lista para compartir o publicar.
              </p>
            </div>
          </div>
          <Link
            to="/portfolio"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shrink-0"
            style={{ background: 'linear-gradient(to right, #1D4ED8, #2563EB)' }}
          >
            Generar <ChevronRight size={14} />
          </Link>
        </div>


      </main>
    </div>
  )
}

// Icono inline para no romper el patrón de importación de Lucide
const HelpCircleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
  </svg>
)

export default Dashboard