import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import API_URL from '../api/api'
import Button from '../components/Button'
import InputField from '../components/InputField'
import LoginJobImg from '../assets/login/Login.webp'
import LogoNext from '../components/LogoNext'

// ── Helpers de validación ──────────────────────────────────────────────────────
// Para el backend: mover a src/utils/validators.js
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const sanitize = (value) => value.trim()

// ── Componente ─────────────────────────────────────────────────────────────────
const Login = () => {
    const navigate = useNavigate()

    const [formData, setFormData] = useState({ email: '', password: '' })
    const [errores, setErrores] = useState({})
    const [isLoading, setIsLoading] = useState(false)

    // Actualiza el campo y limpia su error en tiempo real
    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errores[name]) {
            setErrores(prev => ({ ...prev, [name]: null }))
        }
    }

    // Validación completa antes de enviar
    const validate = () => {
        const errs = {}
        const email = sanitize(formData.email)
        const password = formData.password

        if (!email) errs.email = 'El correo es obligatorio.'
        else if (!isValidEmail(email)) errs.email = 'Ingresa un correo válido.'
        if (!password) errs.password = 'La contraseña es obligatoria.'

        return errs
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrores(errs); return }

        setIsLoading(true)
        setErrores({}) // Limpiar errores previos

        try {
            const email = sanitize(formData.email)
            const password = formData.password

            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })

            const data = await response.json()

            if (!response.ok) {
                // Manejar errores (ej. 401, 404)
                setErrores({ global: data.mensaje || 'Error al iniciar sesión' })
                return
            }

            // Éxito
            localStorage.setItem('next_token', data.token)
            localStorage.setItem('next_user', JSON.stringify(data.user))
            localStorage.setItem('next_session', 'true')

            // Redirigir al dashboard
            navigate('/dashboard', { replace: true })
        } catch (error) {
            console.error('Error en login:', error)
            setErrores({ global: 'Error de conexión con el servidor.' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col-reverse sm:flex-row min-h-screen sm:h-screen w-full relative overflow-y-auto sm:overflow-hidden">

            {/* ── Logo mobile ─────────────────────────────────── */}
            <div className="sm:hidden absolute top-6 left-6 z-10">
                <LogoNext />
            </div>

            {/* ═══════════════════════════════════════════════════
                PANEL IZQUIERDO — Formulario
            ══════════════════════════════════════════════════════ */}
            <aside
                aria-label="Panel de inicio de sesión"
                className="
                    bg-white flex-1 sm:flex-none
                    sm:w-[45%] lg:w-[42%] xl:w-[38%]
                    min-h-screen sm:h-screen flex sm:items-center sm:justify-center
                    sm:bg-[#31445E] sm:bg-[radial-gradient(circle,#69809E_0%,#31445E_100%)]
                    sm:shadow-[5px_0_30px_rgba(0,0,0,0.25)]
                    pt-20 pb-10 px-5 sm:py-8 relative
                "
            >
                {/* Elementos decorativos de profundidad — solo desktop */}
                <div className="hidden sm:block absolute top-16 -right-16 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                <div className="hidden sm:block absolute bottom-20 -left-12 w-40 h-40 rounded-full bg-[#2563EB]/10 blur-2xl pointer-events-none" />

                {/* Tarjeta del formulario */}
                <div className="
                    bg-white py-10 px-8 sm:px-10 md:px-12
                    rounded-2xl text-center
                    flex flex-col gap-y-5
                    w-full max-w-md
                    shadow-[0_4px_24px_rgba(0,0,0,0.06)]
                    animate-fade-in-up
                ">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Bienvenido de vuelta</h2>
                        <p className="text-gray-400 text-sm mt-1">Inicia sesión para continuar tu ruta</p>
                    </div>

                    <hr className="border-gray-100" />

                    <form
                        onSubmit={handleSubmit}
                        noValidate
                        aria-label="Formulario de inicio de sesión"
                    >
                        {/* Error global (credenciales incorrectas) */}
                        {errores.global && (
                            <div
                                role="alert"
                                className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 mb-3 text-left animate-fade-in"
                            >
                                <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-red-600 text-sm">{errores.global}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-0.5">
                            <InputField
                                type="email"
                                placeholder="Correo electrónico"
                                Icono={Mail}
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                error={errores.email}
                                autoComplete="email"
                                maxLength={254}
                                required
                            />
                            <InputField
                                type="password"
                                placeholder="Contraseña"
                                Icono={Lock}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                error={errores.password}
                                autoComplete="current-password"
                                maxLength={128}
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between mt-2 mb-5">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    className="w-4 h-4 accent-[#2563EB] cursor-pointer"
                                />
                                <span className="text-gray-500 text-sm select-none">Recordarme</span>
                            </label>
                            <button
                                type="button"
                                className="text-[#2563EB] text-sm font-medium hover:underline cursor-pointer"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        <Button
                            text="Iniciar sesión"
                            type="submit"
                            loading={isLoading}
                        />
                    </form>

                    <p className="text-sm text-gray-500">
                        ¿No tienes cuenta?{' '}
                        <Link to="/signin" className="font-semibold text-[#2563EB] hover:underline">
                            Crear una gratis
                        </Link>
                    </p>
                </div>
            </aside>

            {/* ═══════════════════════════════════════════════════
                PANEL DERECHO — Hero (solo desktop)
            ══════════════════════════════════════════════════════ */}
            <section
                aria-label="Sección informativa"
                className="hidden sm:flex flex-1 flex-col h-screen text-center px-8 py-8"
            >
                <div className="mb-auto">
                    <LogoNext />
                </div>

                <div className="flex flex-col items-center justify-center gap-6 flex-1">
                    <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 text-pretty px-4 leading-snug">
                        Conecta tu talento <br />
                        <span className="font-medium text-gray-600">
                            con tu{' '}
                            <span className="text-[#2563EB]">próximo</span>{' '}
                            <span className="text-[#4ADE80]">empleo</span>
                        </span>
                    </h1>
                    <img
                        src={LoginJobImg}
                        alt="Persona buscando empleo"
                        className="w-full max-w-72 lg:max-w-[26rem] xl:max-w-[30rem] drop-shadow-sm"
                    />
                </div>
            </section>
        </div>
    )
}

export default Login