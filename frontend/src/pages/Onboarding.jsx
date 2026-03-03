import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, ChevronRight, ChevronLeft, Sparkles,
  Monitor, Briefcase, Palette, Megaphone, HeartPulse,
  Scale, Calculator, FlaskConical, GraduationCap, Wrench,
  HelpCircle, BookOpen, Search, Star
} from 'lucide-react'
import LogoNext from '../components/LogoNext'
import axiosInstance from '../api/axiosInstance'

// ─── Catálogo ─────────────────────────────────────────────────────────────────
const AREAS = [
  { id: 'tech', label: 'Tecnología e Informática', icon: Monitor, color: '#2563EB' },
  { id: 'business', label: 'Administración y Negocios', icon: Briefcase, color: '#10B981' },
  { id: 'design', label: 'Diseño y Artes Creativas', icon: Palette, color: '#F59E0B' },
  { id: 'marketing', label: 'Marketing y Comunicación', icon: Megaphone, color: '#EC4899' },
  { id: 'health', label: 'Ciencias de la Salud', icon: HeartPulse, color: '#EF4444' },
  { id: 'law', label: 'Derecho y Ciencias Sociales', icon: Scale, color: '#8B5CF6' },
  { id: 'finance', label: 'Finanzas y Contabilidad', icon: Calculator, color: '#0EA5E9' },
  { id: 'engineering', label: 'Ingeniería', icon: Wrench, color: '#F97316' },
  { id: 'science', label: 'Ciencias e Investigación', icon: FlaskConical, color: '#84CC16' },
  { id: 'education', label: 'Educación y Pedagogía', icon: GraduationCap, color: '#A78BFA' },
  { id: 'other', label: 'Otra área', icon: HelpCircle, color: '#94A3B8' },
]

const SKILLS_BY_AREA = {
  tech: ['Programación', 'Bases de datos', 'Resolución de problemas', 'React', 'Python', 'SQL', 'Git', 'Inglés técnico', 'Pensamiento lógico', 'Trabajo en equipo'],
  business: ['Gestión de proyectos', 'Excel avanzado', 'Liderazgo', 'Atención al cliente', 'Negociación', 'Análisis de datos', 'PowerPoint', 'Comunicación efectiva', 'Trabajo en equipo', 'Planificación estratégica'],
  design: ['Figma', 'Adobe Illustrator', 'Photoshop', 'Tipografía', 'Branding', 'UX/UI', 'Creatividad', 'Comunicación visual', 'Portafolio', 'Manejo del color'],
  marketing: ['Redes sociales', 'Copywriting', 'SEO/SEM', 'Google Analytics', 'Canva', 'Contenidos digitales', 'Email marketing', 'Investigación de mercado', 'Marca personal', 'Comunicación'],
  health: ['Atención al paciente', 'Trabajo bajo presión', 'Empatía', 'Primeros auxilios', 'Documentación clínica', 'Trabajo en equipo', 'Ética profesional', 'Investigación', 'Comunicación asertiva', 'Anatomía'],
  law: ['Redacción jurídica', 'Investigación legal', 'Argumentación', 'Ética', 'Análisis crítico', 'Oratoria', 'Negociación', 'Mediación', 'Derecho laboral', 'Trabajo en equipo'],
  finance: ['Contabilidad', 'Excel financiero', 'Análisis financiero', 'Power BI', 'Tributación', 'Auditoría', 'Gestión de riesgos', 'Atención al detalle', 'Pensamiento analítico', 'Ética financiera'],
  engineering: ['AutoCAD', 'Gestión de proyectos', 'Resolución de problemas', 'Trabajo en campo', 'Lectura de planos', 'Matlab', 'Control de calidad', 'Trabajo en equipo', 'Seguridad industrial', 'Pensamiento sistémico'],
  science: ['Investigación', 'Estadística', 'Redacción científica', 'R / Python', 'Laboratorio', 'Análisis de datos', 'Pensamiento crítico', 'Metodología científica', 'Inglés académico', 'Presentación de resultados'],
  education: ['Planificación curricular', 'Didáctica', 'Comunicación', 'Empatía', 'Manejo de grupos', 'Herramientas digitales', 'Evaluación formativa', 'Liderazgo', 'Creatividad', 'Adaptabilidad'],
  other: ['Trabajo en equipo', 'Comunicación efectiva', 'Liderazgo', 'Resolución de problemas', 'Adaptabilidad', 'Creatividad', 'Pensamiento crítico', 'Gestión del tiempo', 'Ética profesional', 'Inglés'],
}

const SITUATIONS = [
  { id: 'studying', label: 'Estudiante en proceso', desc: 'Aún cursando mi carrera universitaria', badge: '📚' },
  { id: 'graduating', label: 'Próximo a graduarme', desc: 'En mi último año o semestre', badge: '🎓' },
  { id: 'graduated', label: 'Recién graduado', desc: 'Graduado hace menos de 1 año', badge: '✨' },
  { id: 'searching', label: 'En búsqueda activa', desc: 'Tengo algo de experiencia y busco oportunidad', badge: '🚀' },
]

const JOB_TYPES = [
  { id: 'internship', label: 'Pasantía / Práctica', desc: 'Mis primeros pasos en el mundo laboral', badge: '🌱' },
  { id: 'first_job', label: 'Primer empleo formal', desc: 'Busco mi primer contrato de trabajo', badge: '💼' },
  { id: 'parttime', label: 'Trabajo part-time', desc: 'Quiero trabajar mientras estudio', badge: '⏰' },
  { id: 'freelance', label: 'Freelance / Proyectos', desc: 'Me interesa trabajar por cuenta propia', badge: '🎯' },
  { id: 'remote', label: 'Trabajo remoto', desc: 'Prefiero trabajar desde cualquier lugar', badge: '🌎' },
]

const GOALS = [
  { id: 'cv', label: 'Mejorar mi hoja de vida', badge: '📄' },
  { id: 'skills', label: 'Identificar mis brechas', badge: '🔍' },
  { id: 'network', label: 'Conectar con empresas', badge: '🤝' },
  { id: 'salary', label: 'Conocer mi valor salarial', badge: '💰' },
  { id: 'coach', label: 'Tener un mentor / coach', badge: '🧑‍🏫' },
  { id: 'practice', label: 'Prepararme para entrevistas', badge: '🎤' },
]

// ─── Barra de progreso (azul = next-primary) ──────────────────────────────────
const TopBar = ({ step, total }) => (
  <div className="w-full max-w-2xl mx-auto px-4 sm:px-8 pb-4 sm:pb-6">
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-[#2563EB]" />
        <span className="text-[#2563EB] text-xs font-semibold uppercase tracking-widest">Instructor IA</span>
      </div>
      <span className="text-gray-400 text-xs font-medium">Paso {step} de {total}</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-[3px]">
      <div
        className="h-[3px] rounded-full transition-all duration-500"
        style={{ width: `${(step / total) * 100}%`, background: 'linear-gradient(to right, #1B49AE, #22D3EE)' }}
      />
    </div>
  </div>
)

// ─── Botones de navegación ────────────────────────────────────────────────────
const NavButtons = ({ step, totalSteps, canAdvance, onBack, onNext, onFinish }) => (
  <div className="flex gap-3 w-full max-w-2xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-6 sm:pb-8">
    {step > 1 && (
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all cursor-pointer text-sm font-medium"
      >
        <ChevronLeft size={16} /> Atrás
      </button>
    )}
    {step < totalSteps ? (
      <button
        onClick={onNext}
        disabled={!canAdvance}
        className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-2xl font-semibold text-sm transition-all duration-200
                    ${canAdvance
            ? 'text-white hover:opacity-90 hover:scale-[1.01] cursor-pointer shadow-sm'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        style={canAdvance ? { background: 'linear-gradient(to right, #1B49AE, #2563EB)' } : {}}
      >
        Continuar <ChevronRight size={16} />
      </button>
    ) : (
      <button
        onClick={onFinish}
        disabled={!canAdvance || step === 'loading'}
        className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-2xl font-semibold text-sm transition-all duration-200
                    ${canAdvance && step !== 'loading'
            ? 'text-white hover:opacity-90 hover:scale-[1.01] cursor-pointer shadow-md shadow-blue-200'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        style={canAdvance && step !== 'loading' ? { background: 'linear-gradient(to right, #1B49AE, #2563EB)' } : {}}
      >
        <Sparkles size={16} />
        {step === 'loading' ? 'Guardando...' : 'Activar mi perfil'}
      </button>
    )}
  </div>
)

// ─── PASO 1: Área — 3 columnas para evitar scroll ────────────────────────────
const StepArea = ({ selected, onSelect }) => (
  <div className="flex-1 flex flex-col gap-4 w-full max-w-2xl mx-auto px-4 sm:px-8 overflow-y-auto">
    <div className="text-center mb-2">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 mb-3">
        <BookOpen size={22} className="text-[#2563EB]" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">¿En qué área te estás formando?</h2>
      <p className="text-gray-400 text-sm mt-1">Tu Instructor IA personalizará tu ruta según tu carrera</p>
    </div>
    {/* 3 columnas → 11 ítems caben sin scroll */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {AREAS.map(({ id, label, icon: Icon, color }) => {
        const isSelected = selected === id
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer
                            ${isSelected
                ? 'border-[#2563EB] bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
              }`}
          >
            <div
              className="p-1.5 rounded-lg flex-shrink-0"
              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
            >
              <Icon size={16} style={{ color }} />
            </div>
            <span className={`font-medium text-xs leading-tight ${isSelected ? 'text-[#2563EB]' : 'text-gray-700'}`}>
              {label}
            </span>
            {isSelected && <CheckCircle size={14} className="ml-auto text-[#2563EB] flex-shrink-0" />}
          </button>
        )
      })}
    </div>
  </div>
)

// ─── PASO 2: Situación académica ──────────────────────────────────────────────
const StepSituation = ({ selected, onSelect }) => (
  <div className="flex-1 flex flex-col gap-4 w-full max-w-2xl mx-auto px-4 sm:px-8 overflow-y-auto">
    <div className="text-center mb-2">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 mb-3">
        <GraduationCap size={22} className="text-[#2563EB]" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">¿Cuál es tu situación actual?</h2>
      <p className="text-gray-400 text-sm mt-1">Esto prioriza lo más crítico para ti en este momento</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {SITUATIONS.map(({ id, label, desc, badge }) => {
        const isSelected = selected === id
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer
                            ${isSelected
                ? 'border-[#2563EB] bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
              }`}
          >
            <span className="text-2xl flex-shrink-0">{badge}</span>
            <div>
              <p className={`font-semibold text-sm ${isSelected ? 'text-[#2563EB]' : 'text-gray-800'}`}>{label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
            </div>
            {isSelected && <CheckCircle size={16} className="ml-auto text-[#2563EB] flex-shrink-0" />}
          </button>
        )
      })}
    </div>
  </div>
)

// ─── PASO 3: Tipo de oportunidad ──────────────────────────────────────────────
const StepJobType = ({ selected, onSelect }) => (
  <div className="flex-1 flex flex-col gap-4 w-full max-w-2xl mx-auto px-4 sm:px-8 overflow-y-auto">
    <div className="text-center mb-2">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 mb-3">
        <Search size={22} className="text-[#2563EB]" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">¿Qué tipo de oportunidad buscas?</h2>
      <p className="text-gray-400 text-sm mt-1">Filtramos las vacantes que más se ajustan a ti</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {JOB_TYPES.map(({ id, label, desc, badge }) => {
        const isSelected = selected === id
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer
                            ${isSelected
                ? 'border-[#2563EB] bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
              }`}
          >
            <span className="text-2xl flex-shrink-0">{badge}</span>
            <div>
              <p className={`font-semibold text-sm ${isSelected ? 'text-[#2563EB]' : 'text-gray-800'}`}>{label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
            </div>
            {isSelected && <CheckCircle size={16} className="ml-auto text-[#2563EB] flex-shrink-0" />}
          </button>
        )
      })}
    </div>
  </div>
)

// ─── PASO 4: Habilidades ──────────────────────────────────────────────────────
const StepSkills = ({ area, selected, onToggle }) => {
  const skills = SKILLS_BY_AREA[area] || []
  return (
    <div className="flex-1 flex flex-col gap-4 w-full max-w-2xl mx-auto px-4 sm:px-8 overflow-y-auto">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 mb-3">
          <Star size={22} className="text-[#2563EB]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">¿Qué habilidades ya tienes?</h2>
        <p className="text-gray-400 text-sm mt-1">Técnicas y blandas — todas cuentan para tu score</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {skills.map(skill => {
          const isSelected = selected.includes(skill)
          return (
            <button
              key={skill}
              onClick={() => onToggle(skill)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 cursor-pointer
                                ${isSelected
                  ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-sm shadow-blue-200'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-[#2563EB]'
                }`}
            >
              {isSelected && <span className="mr-1">✓</span>}
              {skill}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-center text-[#2563EB] text-xs font-medium mt-1">
          {selected.length} habilidad{selected.length !== 1 ? 'es' : ''} seleccionada{selected.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── PASO 5: Metas ────────────────────────────────────────────────────────────
const StepGoals = ({ selected, onToggle }) => (
  <div className="flex-1 flex flex-col gap-4 w-full max-w-2xl mx-auto px-4 sm:px-8 overflow-y-auto">
    <div className="text-center mb-2">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 mb-3">
        <Sparkles size={22} className="text-[#2563EB]" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">¿Qué esperas lograr con NEXT?</h2>
      <p className="text-gray-400 text-sm mt-1">Tu Instructor priorizará sus consejos según tus metas</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {GOALS.map(({ id, label, badge }) => {
        const isSelected = selected.includes(id)
        return (
          <button
            key={id}
            onClick={() => onToggle(id)}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer
                            ${isSelected
                ? 'border-[#2563EB] bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
              }`}
          >
            <span className="text-xl flex-shrink-0">{badge}</span>
            <span className={`font-medium text-sm ${isSelected ? 'text-[#2563EB]' : 'text-gray-700'}`}>{label}</span>
            {isSelected && <CheckCircle size={15} className="ml-auto text-[#2563EB] flex-shrink-0" />}
          </button>
        )
      })}
    </div>
    {selected.length > 0 && (
      <p className="text-center text-[#2563EB] text-xs font-medium mt-1">
        {selected.length} meta{selected.length !== 1 ? 's' : ''} seleccionada{selected.length !== 1 ? 's' : ''}
      </p>
    )}
  </div>
)

// ─── Componente principal ─────────────────────────────────────────────────────
const TOTAL_STEPS = 5

const Onboarding = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [area, setArea] = useState('')
  const [situation, setSituation] = useState('')
  const [jobType, setJobType] = useState('')
  const [skills, setSkills] = useState([])
  const [goals, setGoals] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  const toggleSkill = (skill) =>
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])

  const toggleGoal = (id) =>
    setGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])

  const handleAreaSelect = (id) => {
    setArea(id)
    setSkills([])
  }

  const canAdvance = () => {
    if (step === 1) return area !== ''
    if (step === 2) return situation !== ''
    if (step === 3) return jobType !== ''
    if (step === 4) return skills.length > 0
    if (step === 5) return goals.length > 0
    return false
  }

  // ✅ PUT /api/user/update para sincronizar en MySQL
  const handleFinish = async () => {
    try {
      setIsSaving(true)

      const payload = {
        area: area,
        jobType: jobType,
        skills: skills,
        goals: goals
      }

      // Axios envía el Authorization Bearer automáticamente gracias al interceptor
      const response = await axiosInstance.put('/user/update', payload)

      if (response.status === 200) {
        // Objeto devuelto por la Base de Datos con el nuevo score
        const { user } = response.data

        // Guardar respaldo local
        localStorage.setItem('next_profile', JSON.stringify({ ...payload }))

        // Redirigir al inicio formal (dashboard hidratado)
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Error al guardar datos de onboarding:', error)
      alert('Hubo un error al guardar tu perfil. Intenta nuevamente.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    // Fondo blanco — coherente con Login, SignIn y Home
    <div className="min-h-screen w-full bg-white flex flex-col">

      {/* Logo centrado con espacio generoso — coherente con Login y SignIn */}
      <header className="w-full flex justify-center items-center pt-6 pb-4 sm:pt-10 sm:pb-8 pl-6 sm:pl-12 flex-shrink-0">
        <LogoNext />
      </header>

      {/* Barra de progreso */}
      <TopBar step={step} total={TOTAL_STEPS} />

      {/* Contenido del paso actual */}
      <div className="flex-1 flex flex-col justify-center py-4 min-h-0">
        {step === 1 && <StepArea selected={area} onSelect={handleAreaSelect} />}
        {step === 2 && <StepSituation selected={situation} onSelect={setSituation} />}
        {step === 3 && <StepJobType selected={jobType} onSelect={setJobType} />}
        {step === 4 && <StepSkills area={area} selected={skills} onToggle={toggleSkill} />}
        {step === 5 && <StepGoals selected={goals} onToggle={toggleGoal} />}
      </div>

      {/* Navegación fija al fondo */}
      <NavButtons
        step={isSaving ? 'loading' : step}
        totalSteps={TOTAL_STEPS}
        canAdvance={canAdvance() && !isSaving}
        onBack={() => setStep(s => s - 1)}
        onNext={() => setStep(s => s + 1)}
        onFinish={handleFinish}
      />
    </div>
  )
}

export default Onboarding