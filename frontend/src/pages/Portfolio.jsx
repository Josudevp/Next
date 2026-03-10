import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Globe, Download, ChevronLeft, Loader2, CheckCircle2, AlertCircle, Shuffle } from 'lucide-react'
import API_URL from '../api/api'
import LogoNext from '../components/LogoNext'

// ── Helpers ───────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('next_token')

// ── Template catalog (mirrors backend _TEMPLATE_IDS) ─────────────────────────
const TEMPLATES = [
    {
        id: 'classic-blue',
        name: 'Classic Blue',
        desc: 'Héroe oscuro con acento azul corporativo.',
        best: 'Tecnología, ingeniería, startups',
        colors: ['#0F172A', '#2563EB'],
    },
    {
        id: 'emerald-split',
        name: 'Emerald Split',
        desc: 'Diseño limpio en blanco con héroe de dos columnas.',
        best: 'Salud, educación, sector público',
        colors: ['#059669', '#ECFDF5'],
    },
    {
        id: 'midnight-dark',
        name: 'Midnight Dark',
        desc: 'Modo oscuro moderno con acento cian neón.',
        best: 'Desarrollo de software, DevOps, videojuegos',
        colors: ['#0D1117', '#38BDF8'],
    },
    {
        id: 'sidebar',
        name: 'Sidebar',
        desc: 'Barra lateral fija oscura con foto y contactos; contenido principal a la derecha.',
        best: 'Ventas, negocios, gerencia, emprendimiento',
        colors: ['#1A1F2E', '#10B981'],
    },
    {
        id: 'magazine',
        name: 'Magazine',
        desc: 'Cuadrícula bento en el héroe; secciones en layout editorial asimétrico.',
        best: 'Diseño, marketing, UX/UI, publicidad, creativos',
        colors: ['#0D9488', '#E11D48'],
    },
    {
        id: 'numbered-story',
        name: 'Numbered Story',
        desc: 'Bandas numeradas a todo ancho con tipografía Bebas Neue y acento naranja.',
        best: 'Finanzas, derecho, consultoría, academia',
        colors: ['#0A0A0A', '#F97316'],
    },
]

// ── Component ─────────────────────────────────────────────────────────────────
const Portfolio = () => {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [selected, setSelected] = useState(null) // null = auto-pick (anti-repeat)

    const handleGenerate = async () => {
        setIsLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const token = getToken()
            if (!token) { navigate('/login', { replace: true }); return }

            const url = selected
                ? `${API_URL}/portfolio/generate?template=${encodeURIComponent(selected)}`
                : `${API_URL}/portfolio/generate`

            const response = await fetch(url, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || 'No se pudo generar el portfolio')
            }

            const disposition = response.headers.get('Content-Disposition') || ''
            const match = disposition.match(/filename="?([^"]+)"?/)
            const filename = match ? match[1] : 'Portfolio.html'

            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(blobUrl)

            setSuccess(true)
        } catch (err) {
            console.error('[Portfolio]', err)
            setError(err.message || 'Error al generar el portfolio. Intenta de nuevo.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* ── Navbar ── */}
            <nav className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-8 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                    >
                        <ChevronLeft size={16} />
                        Dashboard
                    </button>
                </div>
                <LogoNext />
                <div className="w-24" />
            </nav>

            <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">

                {/* ── Hero header ── */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center mx-auto mb-5">
                        <Globe size={30} className="text-[#2563EB]" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
                        Portfolio Web
                    </h1>
                    <p className="text-gray-500 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
                        Convierte tu CV en una landing page profesional. Elige una plantilla o déjanos elegir por ti.
                    </p>
                </div>

                {/* ── Template hub ── */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-gray-900">Elige una plantilla</h2>
                        <button
                            onClick={() => setSelected(null)}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${selected === null ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                            <Shuffle size={12} />
                            Auto
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {TEMPLATES.map((tpl) => {
                            const isActive = selected === tpl.id
                            return (
                                <button
                                    key={tpl.id}
                                    onClick={() => setSelected(isActive ? null : tpl.id)}
                                    className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${isActive ? 'border-[#2563EB] ring-2 ring-[#2563EB] ring-offset-2 bg-white shadow-md' : 'border-gray-100 bg-white shadow-sm hover:border-gray-300 hover:shadow-md'}`}
                                >
                                    {/* Color swatch */}
                                    <div className="flex gap-1.5 mb-3">
                                        {tpl.colors.map((c, i) => (
                                            <span
                                                key={i}
                                                className="w-5 h-5 rounded-full border border-black/10 flex-shrink-0"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                    <p className="font-bold text-gray-900 text-sm mb-1">{tpl.name}</p>
                                    <p className="text-gray-400 text-xs leading-snug mb-2">{tpl.desc}</p>
                                    <p className="text-[10px] font-semibold text-[#2563EB] bg-[#EFF6FF] rounded-lg px-2 py-0.5 inline-block leading-5">
                                        {tpl.best}
                                    </p>
                                </button>
                            )
                        })}
                    </div>

                    {selected === null && (
                        <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                            <Shuffle size={11} />
                            Modo automático — cada descarga evita repetir la última plantilla usada
                        </p>
                    )}
                </div>

                {/* ── CTA card ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {selected ? `Generar con "${TEMPLATES.find(t => t.id === selected)?.name}"` : 'Generar mi portfolio'}
                    </h2>
                    <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                        Usaremos los datos de tu CV guardado para crear el HTML.
                        {' '}Si aún no tienes CV, créalo primero en el{' '}
                        <Link to="/coach?mode=createcv" className="text-[#2563EB] font-semibold hover:underline">
                            CV Maker
                        </Link>.
                    </p>

                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-left">
                            <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-left">
                            <CheckCircle2 size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-green-700 text-sm font-medium">
                                ¡Portfolio descargado! Ábrelo en tu navegador o súbelo a GitHub Pages / Netlify Drop.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2.5 bg-[#2563EB] hover:bg-blue-700 active:scale-95 text-white font-bold text-sm px-8 py-3.5 rounded-2xl transition-all shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isLoading
                            ? <><Loader2 size={16} className="animate-spin" /> Generando...</>
                            : <><Download size={16} /> Descargar Portfolio HTML</>
                        }
                    </button>

                    <p className="mt-4 text-xs text-gray-400">
                        Archivo .html auto-contenido · Listo para GitHub Pages, Netlify Drop o cualquier hosting
                    </p>
                </div>

                {/* ── How to host section ── */}
                <div className="mt-8 bg-[#0F172A] rounded-2xl p-6 text-white">
                    <h3 className="font-bold text-base mb-4 text-white/90">¿Cómo publicarlo gratis?</h3>
                    <ol className="space-y-3 text-sm text-white/70">
                        <li className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                            <span><strong className="text-white/90">Netlify Drop</strong> — arrastra y suelta el archivo en <span className="text-[#60A5FA]">app.netlify.com/drop</span> y tendrás una URL en segundos.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                            <span><strong className="text-white/90">GitHub Pages</strong> — sube el archivo a un repositorio y activa Pages desde Settings.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                            <span><strong className="text-white/90">Compartir directo</strong> — envíalo por correo o LinkedIn para que lo abran en su navegador.</span>
                        </li>
                    </ol>
                </div>

            </main>
        </div>
    )
}

export default Portfolio
