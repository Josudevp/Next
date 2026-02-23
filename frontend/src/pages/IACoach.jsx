import { useNavigate } from 'react-router-dom'
import { Bot, ChevronLeft, Sparkles, FileText, Mic, Target } from 'lucide-react'
import LogoNext from '../components/LogoNext'

const FEATURES = [
  { icon: FileText, label: 'Generador de CV con IA', desc: 'Crea o mejora tu hoja de vida con lenguaje optimizado para reclutadores.' },
  { icon: Mic, label: 'Simulador de entrevistas', desc: 'Practica con preguntas reales de tu área y recibe retroalimentación instantánea.' },
  { icon: Target, label: 'Análisis de brecha laboral', desc: 'Descubre qué habilidades te faltan para el trabajo que quieres.' },
]

const IACoach = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#2563EB] transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} /> Volver al Dashboard
          </button>
          <div className="ml-auto">
            <LogoNext />
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-2xl mx-auto w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-[#2563EB] text-xs font-semibold px-4 py-2 rounded-full mb-6 animate-fade-in">
          <Sparkles size={13} />
          Próximamente
        </div>

        {/* Ilustración */}
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200/40 animate-fade-in-up"
          style={{ background: 'linear-gradient(135deg, #1B49AE 0%, #2563EB 60%, #22D3EE 100%)' }}
        >
          <Bot size={52} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3 animate-fade-in-up">IA Coach</h1>
        <p className="text-gray-400 text-base leading-relaxed mb-10 animate-fade-in-up">
          Tu mentor de carrera inteligente. Potenciado por Gemini AI,
          te ayudará a prepararte para el mercado laboral con herramientas personalizadas.
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-10">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="bg-white border border-gray-100 rounded-2xl p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-fade-in-up"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                <Icon size={17} className="text-[#2563EB]" />
              </div>
              <p className="font-semibold text-gray-800 text-sm mb-1">{label}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] cursor-pointer"
          style={{ background: 'linear-gradient(to right, #1B49AE, #2563EB)' }}
        >
          <ChevronLeft size={14} /> Volver al Dashboard
        </button>
      </main>
    </div>
  )
}

export default IACoach