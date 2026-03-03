import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API_URL from '../api/api'
import {
  Bell, ChevronRight, Lightbulb, Bot,
  Briefcase, TrendingUp, RefreshCw, LogOut, User as UserIcon, Settings, HelpCircle
} from 'lucide-react'
import LogoNext from '../components/LogoNext'
import ProfileEdit from '../components/ProfileEdit'
import axiosInstance from '../api/axiosInstance'

// ─────────────────────────────────────────────────────────────────────────────
// (El Score ahora se consume enteramente desde MySQL backend)
// ─────────────────────────────────────────────────────────────────────────────
const CircularProgress = ({ percentage }) => {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (percentage / 100) * circ

  return (
    <svg width="110" height="110" viewBox="0 0 100 100" className="flex-shrink-0">
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
const UserAvatar = ({ name, onLogout, onEditProfile }) => {
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
        className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B49AE] to-[#22D3EE] flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
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
            onClick={() => { onEditProfile(); setOpen(false); }}
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
    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-100 bg-white hover:border-[#2563EB]/30 hover:bg-blue-50/40 transition-all duration-150 cursor-pointer group"
  >
    <span className="text-sm text-gray-700 font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-[#10B981] bg-green-50 px-2 py-0.5 rounded-full">{boost}</span>
      <ChevronRight size={14} className="text-gray-300 group-hover:text-[#2563EB] transition-colors" />
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
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // ── Auth guard + carga de datos remotos ──────────────────────────────────
  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      const session = localStorage.getItem('next_session')
      const token = localStorage.getItem('next_token')
      const storedUser = JSON.parse(localStorage.getItem('next_user') || 'null')

      if (!session || !token || !storedUser) {
        navigate('/login', { replace: true })
        return
      }

      setUser(storedUser)

      try {
        // Obtenemos los datos directos desde MySQL centralizados
        const response = await axiosInstance.get('/user/profile')
        const dbProfile = response.data

        setProfile(dbProfile)
        setScore(dbProfile.score || 0)

      } catch (error) {
        console.error('Error fetching DB profile:', error)
        // No usar fallback inseguro local, redirigir al onboarding siempre que el perfil no exista o falle
        navigate('/onboarding', { replace: true })
      }
    }

    checkAuthAndFetchProfile()
  }, [navigate])

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

  const firstName = user.name ? user.name.split(' ')[0] : 'Usuario'
  const skillsArray = profile?.skills || []
  const weeklySkill = skillsArray[0] || 'Comunicación efectiva'
  const skillBoost = Math.max(4, Math.min(8, 15 - skillsArray.length))

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ════════════════════════════════════════════════════
                NAV — Logo + Acciones
            ════════════════════════════════════════════════════ */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <LogoNext />
          <div className="flex items-center gap-3">
            {/* Notificaciones — estático para Beta */}
            <button
              aria-label="Notificaciones"
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full ring-2 ring-white" />
            </button>

            <UserAvatar
              name={user.name}
              onLogout={handleLogout}
              onEditProfile={() => setIsEditingProfile(!isEditingProfile)}
            />
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════
                CONTENIDO PRINCIPAL
            ════════════════════════════════════════════════════ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── SECCIÓN DE EDICIÓN DE PERFIL (Toggleable) ── */}
        {isEditingProfile && (
          <section className="animate-fade-in-up mb-10 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" /> Configuración de Perfil
              </h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-sm text-gray-400 hover:text-gray-600 font-medium cursor-pointer"
              >
                Cerrar editor
              </button>
            </div>
            <ProfileEdit onProfileUpdated={(updatedUser) => {
              setProfile(updatedUser);
              setScore(updatedUser.score);
              // Actualizamos también el localStorage para persistencia visual inmediata
              localStorage.setItem('next_user', JSON.stringify({
                name: updatedUser.name,
                email: updatedUser.email
              }));
            }} />
          </section>
        )}

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
                  className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-[#2563EB] border border-blue-100"
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
              <button className="flex items-center gap-1 text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1 hover:border-[#2563EB] hover:text-[#2563EB] transition-all cursor-pointer">
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
                  <TrendingUp size={13} className="text-[#10B981]" />
                  <span className="text-xs text-[#10B981] font-semibold">
                    {score < 60 ? 'En construcción' : score < 80 ? 'Perfil competitivo' : '¡Perfil destacado!'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta: Crece tu empleabilidad */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] animate-fade-in-up">
            <h2 className="font-bold text-gray-900 mb-4">Crece tu empleabilidad</h2>
            <div className="flex flex-col gap-2.5">
              <GrowthItem
                label="Practicar con IA Coach"
                boost="+5%"
                onClick={() => navigate('/ia-coach')}
              />
              <GrowthItem
                label="Actualizar mis habilidades"
                boost="+3%"
                onClick={() => navigate('/onboarding')}
              />
              <GrowthItem
                label="Explorar vacantes afines"
                boost="+2%"
                onClick={() => { }}
              />
            </div>
          </div>
        </div>

        {/* ── FILA 2: IA Coach + Job Hunter ───────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* IA Coach */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4 animate-fade-in-up">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Bot size={18} className="text-[#2563EB]" />
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
            <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 items-center justify-center flex-shrink-0">
              <Bot size={38} className="text-[#2563EB] opacity-80" />
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
                <span className="ml-1.5 text-xs bg-purple-50 text-purple-500 border border-purple-100 px-2 py-0.5 rounded-full font-medium">Próximamente</span>
              </p>
              <button
                disabled
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-not-allowed opacity-50"
                style={{ background: 'linear-gradient(to right, #7C3AED, #8B5CF6)' }}
              >
                Explorar Vacantes
              </button>
            </div>

            <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 items-center justify-center flex-shrink-0">
              <Briefcase size={38} className="text-[#8B5CF6] opacity-80" />
            </div>
          </div>
        </div>

        {/* ── BANNER: Habilidad de la semana ──────────── */}
        <div
          className="rounded-2xl p-5 flex items-center justify-between gap-4 shadow-[0_2px_12px_rgba(37,99,235,0.1)] animate-fade-in-up"
          style={{ background: 'linear-gradient(135deg, #1B49AE 0%, #2563EB 50%, #22D3EE 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Lightbulb size={20} className="text-yellow-300" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-0.5">
                Habilidad de la semana
              </p>
              <p className="text-white font-semibold text-sm sm:text-base">
                <span className="font-bold">{weeklySkill}</span>
                {' — '}Mejorar esta habilidad podría aumentar tu empleabilidad en un{' '}
                <span className="text-yellow-300 font-bold">+{skillBoost}%</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/ia-coach')}
            className="hidden sm:flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex-shrink-0 backdrop-blur-sm"
          >
            Practicar <ChevronRight size={13} />
          </button>
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