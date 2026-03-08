import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, PenLine, FileText, ArrowLeft } from 'lucide-react'
import LogoNext from '../components/LogoNext'

const TEMPLATES = [
  {
    id: 'andrea',
    name: 'Andrea',
    style: 'Rosa Elegante',
    description: 'Diseño creativo con barra lateral rosa y foto circular. Ideal para diseño y artes.',
    accent: '#E8908A',
    bg: '#FDF0EE',
    layout: 'sidebar',
    badge: 'Creativo',
    badgeColor: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'elena',
    name: 'Elena',
    style: 'Minimalista Blanco',
    description: 'Layout limpio y profesional con líneas divisoras. Perfecto para cualquier área.',
    accent: '#1A1A1A',
    bg: '#FFFFFF',
    layout: 'classic',
    badge: 'Universal',
    badgeColor: 'bg-gray-100 text-gray-700',
  },
  {
    id: 'marcela',
    name: 'Marcela',
    style: 'Creative Grid',
    description: 'Diseño moderno con barras de habilidades visuales. Resalta perfiles creativos.',
    accent: '#2D2D2D',
    bg: '#FAFAFA',
    layout: 'grid',
    badge: 'Moderno',
    badgeColor: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'jordi',
    name: 'Jordi',
    style: 'Executive Teal',
    description: 'Cabecera verde oscuro con foto cuadrada. Estilo ejecutivo para finanzas y negocios.',
    accent: '#2F5363',
    bg: '#F4F8F9',
    layout: 'executive',
    badge: 'Ejecutivo',
    badgeColor: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'carlos',
    name: 'Carlos',
    style: 'Dark Pro',
    description: 'Panel izquierdo negro con iconos. Alto contraste para un impacto profesional.',
    accent: '#111111',
    bg: '#1A1A1A',
    layout: 'dark',
    badge: 'Impactante',
    badgeColor: 'bg-neutral-900 text-white',
  },
  {
    id: 'murad',
    name: 'Murad',
    style: 'Tech Pro',
    description: 'Encabezado geométrico azul con foto circular. Diseñado para perfiles tech.',
    accent: '#1E3A6E',
    bg: '#EEF4FF',
    layout: 'tech',
    badge: 'Tech',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'francisco',
    name: 'Francisco',
    style: 'Harvard Classic',
    description: 'El formato clásico con marco de esquina y foto redonda. Referencia acadómica.',
    accent: '#000000',
    bg: '#FFFFFF',
    layout: 'harvard',
    badge: 'Clásico',
    badgeColor: 'bg-zinc-100 text-zinc-800',
  },
  {
    id: 'daniel',
    name: 'Daniel',
    style: 'Modern Blue',
    description: 'Panel azul marino izquierdo con foto circular destacada. Elegante y moderno.',
    accent: '#0F2B4C',
    bg: '#F7F9FC',
    layout: 'modernblue',
    badge: 'Elegante',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'raquel',
    name: 'Raquel',
    style: 'Minimalist Pro',
    description: 'Tipografía grande y barras de progreso. Ideal para UX/UI y diseño digital.',
    accent: '#000000',
    bg: '#FFFFFF',
    layout: 'minimalist',
    badge: 'Minimalist',
    badgeColor: 'bg-gray-100 text-gray-600',
  },
]

// ── Mini Preview SVG por plantilla ────────────────────────────────────────────
const TemplatePreview = ({ template }) => {
  const previews = {
    andrea: (
      <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="160" fill="#FDF0EE" />
        <rect width="45" height="160" fill="#F5C5BF" />
        <circle cx="22" cy="32" r="18" fill="#E8908A" opacity="0.8" />
        <rect x="6" y="58" width="33" height="3" rx="1" fill="#E8908A" />
        <rect x="6" y="66" width="25" height="2" rx="1" fill="#999" />
        <rect x="6" y="71" width="28" height="2" rx="1" fill="#999" />
        <rect x="6" y="76" width="22" height="2" rx="1" fill="#999" />
        <rect x="52" y="12" width="55" height="8" rx="2" fill="#C97D77" />
        <rect x="52" y="24" width="40" height="3" rx="1" fill="#888" />
        <rect x="52" y="40" width="55" height="3" rx="1" fill="#C97D77" />
        <rect x="52" y="47" width="50" height="2" rx="1" fill="#999" />
        <rect x="52" y="52" width="45" height="2" rx="1" fill="#999" />
        <rect x="52" y="57" width="48" height="2" rx="1" fill="#999" />
        <rect x="52" y="70" width="55" height="3" rx="1" fill="#C97D77" />
        <rect x="52" y="77" width="50" height="2" rx="1" fill="#999" />
        <rect x="52" y="82" width="45" height="2" rx="1" fill="#999" />
      </svg>
    ),
    elena: (
      <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="160" fill="#FFFFFF" />
        <circle cx="24" cy="24" r="18" fill="#E5E7EB" />
        <rect x="48" y="12" width="60" height="8" rx="1" fill="#111" />
        <rect x="48" y="22" width="40" height="2" rx="1" fill="#666" />
        <line x1="10" y1="50" x2="110" y2="50" stroke="#DDD" strokeWidth="1" />
        <rect x="10" y="58" width="30" height="2" rx="1" fill="#111" />
        <rect x="48" y="58" width="62" height="2" rx="1" fill="#444" />
        <rect x="48" y="63" width="50" height="2" rx="1" fill="#999" />
        <rect x="48" y="68" width="55" height="2" rx="1" fill="#999" />
        <line x1="10" y1="80" x2="110" y2="80" stroke="#DDD" strokeWidth="1" />
        <rect x="10" y="88" width="30" height="2" rx="1" fill="#111" />
        <rect x="48" y="88" width="62" height="2" rx="1" fill="#444" />
        <rect x="48" y="93" width="50" height="2" rx="1" fill="#999" />
        <rect x="48" y="98" width="55" height="2" rx="1" fill="#999" />
        <rect x="48" y="103" width="45" height="2" rx="1" fill="#999" />
      </svg>
    ),
    marcela: (
      <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="160" fill="#FAFAFA" />
        <rect x="10" y="10" width="68" height="55" rx="2" fill="#F0F0F0" />
        <rect x="10" y="10" width="68" height="14" rx="2" fill="#333" />
        <rect x="13" y="14" width="40" height="6" rx="1" fill="#FFF" opacity="0.9" />
        <circle cx="95" cy="35" r="18" fill="#DDD" />
        <rect x="82" y="72" width="36" height="3" rx="1" fill="#444" />
        <rect x="82" y="78" width="36" height="5" rx="1" fill="#C97D77" opacity="0.7" />
        <rect x="82" y="86" width="36" height="3" rx="1" fill="#444" />
        <rect x="82" y="92" width="36" height="5" rx="1" fill="#C97D77" opacity="0.5" />
        <rect x="82" y="100" width="36" height="3" rx="1" fill="#444" />
        <rect x="82" y="106" width="36" height="5" rx="1" fill="#C97D77" opacity="0.3" />
        <rect x="10" y="72" width="68" height="3" rx="1" fill="#333" />
        <rect x="10" y="79" width="60" height="2" rx="1" fill="#999" />
        <rect x="10" y="84" width="55" height="2" rx="1" fill="#999" />
        <rect x="10" y="89" width="50" height="2" rx="1" fill="#999" />
      </svg>
    ),
    jordi: (
      <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="160" fill="#F4F8F9" />
        <rect width="120" height="50" fill="#2F5363" />
        <rect x="8" y="8" width="30" height="34" fill="#3D6A7A" />
        <rect x="45" y="12" width="65" height="8" rx="1" fill="#FFF" />
        <rect x="45" y="24" width="45" height="3" rx="1" fill="#AAC8D5" />
        <rect x="10" y="60" width="45" height="3" rx="1" fill="#2F5363" />
        <rect x="10" y="67" width="40" height="2" rx="1" fill="#666" />
        <rect x="10" y="72" width="38" height="2" rx="1" fill="#999" />
        <rect x="10" y="77" width="42" height="2" rx="1" fill="#999" />
        <rect x="10" y="90" width="45" height="3" rx="1" fill="#2F5363" />
        <rect x="10" y="97" width="40" height="2" rx="1" fill="#666" />
        <rect x="10" y="102" width="38" height="2" rx="1" fill="#999" />
        <rect x="65" y="58" width="45" height="3" rx="1" fill="#2F5363" />
        <rect x="65" y="65" width="40" height="5" rx="1" fill="#2F5363" opacity="0.3" />
        <rect x="65" y="73" width="40" height="5" rx="1" fill="#2F5363" opacity="0.2" />
        <rect x="65" y="81" width="40" height="5" rx="1" fill="#2F5363" opacity="0.15" />
      </svg>
    ),
    carlos: (
      <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="160" fill="#F5F5F5" />
        <rect width="42" height="160" fill="#111111" />
        <circle cx="21" cy="28" r="16" fill="#333" />
        <rect x="5" y="52" width="32" height="3" rx="1" fill="#EEE" opacity="0.8" />
        <rect x="5" y="60" width="25" height="2" rx="1" fill="#888" />
        <rect x="5" y="65" width="28" height="2" rx="1" fill="#888" />
        <rect x="5" y="80" width="32" height="2" rx="1" fill="#EEE" opacity="0.6" />
        <rect x="5" y="86" width="25" height="2" rx="1" fill="#666" />
        <rect x="5" y="91" width="28" height="2" rx="1" fill="#666" />
        <rect x="5" y="96" width="22" height="2" rx="1" fill="#666" />
        <rect x="50" y="12" width="62" height="7" rx="1" fill="#222" />
        <rect x="50" y="23" width="62" height="3" rx="1" fill="#555" />
        <rect x="50" y="30" width="62" height="3" rx="1" fill="#555" />
        <rect x="50" y="45" width="62" height="3" rx="1" fill="#333" />
        <rect x="50" y="52" width="55" height="2" rx="1" fill="#777" />
        <rect x="50" y="57" width="50" height="2" rx="1" fill="#777" />
        <rect x="50" y="62" width="55" height="2" rx="1" fill="#777" />
        <rect x="50" y="75" width="62" height="3" rx="1" fill="#333" />
        <rect x="50" y="82" width="55" height="2" rx="1" fill="#777" />
        <rect x="50" y="87" width="50" height="2" rx="1" fill="#777" />
      </svg>
    ),
    murad: (
      <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="160" fill="#EEF4FF" />
        <rect width="120" height="55" fill="#1E3A6E" />
        <ellipse cx="30" cy="15" rx="35" ry="25" fill="#2D4F8E" opacity="0.5" />
        <ellipse cx="100" cy="50" rx="30" ry="20" fill="#2D4F8E" opacity="0.4" />
        <circle cx="22" cy="28" r="16" fill="#EEF4FF" opacity="0.9" />
        <rect x="44" y="14" width="65" height="8" rx="1" fill="#FFF" />
        <rect x="44" y="26" width="45" height="3" rx="1" fill="#9AB8E8" />
        <rect x="44" y="33" width="50" height="2" rx="1" fill="#7899C8" />
        <rect x="10" y="65" width="48" height="3" rx="1" fill="#1E3A6E" />
        <rect x="10" y="72" width="42" height="2" rx="1" fill="#555" />
        <rect x="10" y="77" width="45" height="2" rx="1" fill="#555" />
        <rect x="10" y="82" width="38" height="2" rx="1" fill="#888" />
        <rect x="10" y="95" width="48" height="3" rx="1" fill="#1E3A6E" />
        <rect x="10" y="102" width="42" height="2" rx="1" fill="#555" />
        <rect x="10" y="107" width="38" height="2" rx="1" fill="#888" />
        <rect x="66" y="65" width="44" height="3" rx="1" fill="#1E3A6E" />
        <rect x="66" y="72" width="38" height="2" rx="1" fill="#555" />
        <rect x="66" y="77" width="36" height="2" rx="1" fill="#888" />
        <rect x="66" y="84" width="40" height="2" rx="1" fill="#888" />
      </svg>
    ),
    francisco: (
      <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="160" fill="#FFFFFF" />
        <rect x="5" y="5" width="20" height="20" fill="none" stroke="#222" strokeWidth="2" />
        <rect x="95" y="5" width="20" height="20" fill="none" stroke="#222" strokeWidth="2" />
        <rect x="20" y="10" width="80" height="22" rx="0" fill="#FFF" />
        <rect x="25" y="13" width="55" height="10" rx="0" fill="#111" opacity="0.05" />
        <rect x="30" y="14" width="40" height="8" rx="0" fill="#111" />
        <circle cx="95" cy="28" r="16" fill="#E5E7EB" />
        <rect x="10" y="40" width="100" height="1" fill="#000" />
        <rect x="10" y="48" width="50" height="3" rx="1" fill="#000" />
        <rect x="10" y="55" width="95" height="2" rx="1" fill="#444" />
        <rect x="10" y="60" width="90" height="2" rx="1" fill="#444" />
        <rect x="10" y="65" width="85" height="2" rx="1" fill="#666" />
        <rect x="10" y="78" width="50" height="3" rx="1" fill="#000" />
        <rect x="10" y="85" width="90" height="2" rx="1" fill="#444" />
        <rect x="10" y="90" width="85" height="2" rx="1" fill="#666" />
        <rect x="10" y="100" width="50" height="3" rx="1" fill="#000" />
        <rect x="10" y="107" width="85" height="2" rx="1" fill="#444" />
        <rect x="10" y="112" width="78" height="2" rx="1" fill="#666" />
        <rect x="5" y="145" width="20" height="20" fill="none" stroke="#222" strokeWidth="2" />
        <rect x="95" y="145" width="20" height="20" fill="none" stroke="#222" strokeWidth="2" />
      </svg>
    ),
    daniel: (
      <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="160" fill="#F7F9FC" />
        <rect width="38" height="160" fill="#0F2B4C" />
        <circle cx="19" cy="38" r="20" fill="#1A3E6E" stroke="#FFF" strokeWidth="2" />
        <rect x="4" y="68" width="30" height="4" rx="1" fill="#FFF" opacity="0.9" />
        <rect x="6" y="76" width="26" height="2" rx="1" fill="#FFF" opacity="0.5" />
        <rect x="6" y="81" width="24" height="2" rx="1" fill="#FFF" opacity="0.4" />
        <rect x="6" y="86" width="26" height="2" rx="1" fill="#FFF" opacity="0.4" />
        <rect x="6" y="91" width="22" height="2" rx="1" fill="#FFF" opacity="0.4" />
        <rect x="6" y="106" width="26" height="2" rx="1" fill="#FFF" opacity="0.4" />
        <rect x="6" y="111" width="22" height="2" rx="1" fill="#FFF" opacity="0.3" />
        <rect x="46" y="10" width="65" height="7" rx="1" fill="#0F2B4C" />
        <rect x="46" y="20" width="45" height="2" rx="1" fill="#666" />
        <rect x="46" y="35" width="65" height="3" rx="1" fill="#3B7DD8" />
        <rect x="46" y="42" width="58" height="2" rx="1" fill="#666" />
        <rect x="46" y="47" width="62" height="2" rx="1" fill="#888" />
        <rect x="46" y="52" width="58" height="2" rx="1" fill="#888" />
        <rect x="46" y="65" width="65" height="3" rx="1" fill="#3B7DD8" />
        <rect x="46" y="72" width="58" height="2" rx="1" fill="#666" />
        <rect x="46" y="77" width="62" height="2" rx="1" fill="#888" />
        <rect x="46" y="90" width="65" height="3" rx="1" fill="#3B7DD8" />
        <rect x="46" y="97" width="50" height="2" rx="1" fill="#666" />
        <rect x="46" y="102" width="45" height="2" rx="1" fill="#888" />
      </svg>
    ),
    raquel: (
      <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="160" fill="#FFFFFF" />
        <rect x="10" y="10" width="100" height="12" rx="1" fill="#000" />
        <rect x="10" y="26" width="80" height="4" rx="1" fill="#333" />
        <rect x="10" y="32" width="60" height="2" rx="1" fill="#999" />
        <line x1="10" y1="42" x2="110" y2="42" stroke="#000" strokeWidth="1.5" />
        <rect x="10" y="50" width="40" height="3" rx="1" fill="#000" />
        <rect x="60" y="50" width="40" height="3" rx="1" fill="#000" />
        <rect x="10" y="57" width="35" height="2" rx="1" fill="#555" />
        <rect x="60" y="57" width="35" height="2" rx="1" fill="#555" />
        <rect x="10" y="62" width="30" height="2" rx="1" fill="#888" />
        <rect x="60" y="62" width="32" height="2" rx="1" fill="#888" />
        <line x1="10" y1="72" x2="110" y2="72" stroke="#DDD" strokeWidth="1" />
        <rect x="10" y="80" width="40" height="3" rx="1" fill="#000" />
        <rect x="10" y="87" width="36" height="2" rx="1" fill="#444" />
        <rect x="10" y="92" width="88" height="2" rx="1" fill="#777" />
        <rect x="10" y="97" width="80" height="2" rx="1" fill="#777" />
        <line x1="10" y1="107" x2="110" y2="107" stroke="#DDD" strokeWidth="1" />
        <rect x="10" y="115" width="40" height="3" rx="1" fill="#000" />
        <rect x="10" y="122" width="36" height="2" rx="1" fill="#444" />
        <rect x="10" y="127" width="88" height="2" rx="1" fill="#777" />
        <rect x="10" y="132" width="80" height="2" rx="1" fill="#777" />
        <rect x="10" y="137" width="75" height="2" rx="1" fill="#777" />
      </svg>
    ),
  }

  return (
    <div className="w-full h-full">
      {previews[template.id] || (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <FileText className="w-10 h-10 text-gray-300" />
        </div>
      )}
    </div>
  )
}

// ── Tarjeta de plantilla ───────────────────────────────────────────────────────
const TemplateCard = ({ template }) => {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm
                 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer group bg-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Preview Area */}
      <div className="w-full aspect-[3/4] overflow-hidden bg-gray-50">
        <TemplatePreview template={template} />
      </div>

      {/* Info footer */}
      <div className="px-4 py-3 bg-white border-t border-gray-50">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-gray-900 text-sm">{template.style}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${template.badgeColor}`}>
            {template.badge}
          </span>
        </div>
        <p className="text-xs text-gray-400 leading-snug line-clamp-2">{template.description}</p>
      </div>

      {/* Hover Overlay */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-5
                    bg-black/75 backdrop-blur-sm transition-all duration-300
                    ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <p className="text-white font-semibold text-sm mb-1">{template.style}</p>

        {/* Crear con IA */}
        <button
          onClick={() => navigate(`/coach?mode=createcv&templateId=${template.id}`)}
          className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-blue-500
                     text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Crear con IA
        </button>

        {/* Edición Libre — Próximamente */}
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/20
                     text-white/70 text-sm font-medium py-2.5 rounded-xl cursor-not-allowed transition-colors
                     border border-white/20"
        >
          <PenLine className="w-4 h-4" />
          <span>Edición Libre</span>
          <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">Próximamente</span>
        </button>
      </div>
    </div>
  )
}

// ── Página Principal ───────────────────────────────────────────────────────────
const CVMaker = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <LogoNext to="/dashboard" />
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </button>
      </header>

      {/* Hero */}
      <section className="text-center pt-12 pb-8 px-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <FileText className="w-3.5 h-3.5" />
          CV Maker Hub
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
          Elige tu plantilla ideal
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
          Selecciona un diseño, luego crea tu CV con ayuda de IA o edítalo libremente.
          Todos generan un archivo <strong>.docx</strong> listo para usar.
        </p>
      </section>

      {/* Grid 3×3 */}
      <main className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </main>
    </div>
  )
}

export default CVMaker
