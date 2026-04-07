import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import API_URL from '../api/api'

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
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

    // [FIX #1] Ref guard — previene doble submit por clic rápido antes de que
    // React re-renderice con isLoading=true. El flag de estado no es suficiente
    // porque no bloquea en el mismo tick del event loop.
    const isSubmittingRef = useRef(false)
    // [FIX #5] AbortController — cancela el fetch si el componente se desmonta
    // durante la petición (ej. usuario navega atrás mientras espera).
    const abortControllerRef = useRef(null)

    const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false })
    const [errores, setErrores] = useState({})
    const [isLoading, setIsLoading] = useState(false)

    // Cleanup al desmontar: abortar cualquier fetch pendiente
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort()
        }
    }, [])

    // Actualiza el campo y limpia su error en tiempo real
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
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

        // [FIX #1] Bloquear submits simultáneos — el estado de React no es
        // suficiente porque no actualiza en el mismo tick del evento de clic.
        if (isSubmittingRef.current) return

        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrores(errs); return }

        isSubmittingRef.current = true
        setIsLoading(true)
        setErrores({})

        // [FIX #5] Crear AbortController para poder cancelar el fetch si el
        // componente se desmonta mientras la petición está en curso.
        abortControllerRef.current = new AbortController()

        try {
            const email = sanitize(formData.email)
            const password = formData.password
            const rememberMe = formData.rememberMe

            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, rememberMe }),
                signal: abortControllerRef.current.signal,
            })

            const data = await response.json()

            if (!response.ok) {
                setErrores({ global: data.mensaje || 'Error al iniciar sesión' })
                return
            }

            localStorage.setItem('next_token', data.token)
            localStorage.setItem('next_user', JSON.stringify(data.user))
            localStorage.setItem('next_session', 'true')

            navigate('/dashboard', { replace: true })
        } catch (error) {
            // AbortError ocurre cuando el usuario navega antes de recibir respuesta
            if (error.name === 'AbortError') return
            console.error('Error en login:', error)
            setErrores({ global: 'Error de conexión con el servidor.' })
        } finally {
            isSubmittingRef.current = false
            setIsLoading(false)
        }
    }

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            if (isSubmittingRef.current) return
            isSubmittingRef.current = true
            setIsLoading(true)
            setErrores({})

            // [FIX #2] Eliminada la llamada redundante a googleapis.com/userinfo.
            // El backend ya valida el accessToken contra Google en authController.js
            // (Fix #2 de seguridad). Hacer el fetch aquí duplicaba la validación
            // y añadía ~300ms de latencia innecesaria en cada login con Google.
            try {
                const response = await fetch(`${API_URL}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken: tokenResponse.access_token }),
                })
                const data = await response.json()
                if (!response.ok) {
                    setErrores({ global: data.mensaje || 'Error al iniciar sesión con Google' })
                    return
                }
                localStorage.setItem('next_token', data.token)
                localStorage.setItem('next_user', JSON.stringify(data.user))
                localStorage.setItem('next_session', 'true')
                navigate(data.needsOnboarding ? '/onboarding' : '/dashboard', { replace: true })
            } catch (err) {
                if (err.name === 'AbortError') return
                console.error('[Google Login]', err)
                setErrores({ global: 'Error al conectar con Google. Intenta de nuevo.' })
            } finally {
                isSubmittingRef.current = false
                setIsLoading(false)
            }
        },
        onError: () => setErrores({ global: 'Inicio de sesión con Google cancelado.' }),
    })

    return (
        <div className="relative flex min-h-[100dvh] w-full flex-col-reverse overflow-y-auto sm:flex-row sm:overflow-hidden">

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
                    min-h-[100dvh] flex sm:items-center sm:justify-center
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
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    className="w-4 h-4 accent-[#2563EB] cursor-pointer"
                                />
                                <span className="text-gray-500 text-sm select-none">Recordarme</span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-[#2563EB] text-sm font-medium hover:underline cursor-pointer"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <Button
                            text="Iniciar sesión"
                            type="submit"
                            loading={isLoading}
                        />
                    </form>

                    {/* ── Divisor y botón Google (solo si está configurado) ── */}
                    {GOOGLE_ENABLED && (<>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-xs text-gray-400 font-medium">o continúa con</span>
                        <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* ── Botón Google ── */}
                    <button
                        type="button"
                        onClick={() => googleLogin()}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                            <path fill="#4285F4" d="M17.64 9.2c0-.638-.057-1.252-.164-1.84H9v3.48h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
                            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
                        </svg>
                        Continuar con Google
                    </button>
                    </>)}

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
                className="hidden sm:flex flex-1 flex-col min-h-[100dvh] text-center px-8 py-8"
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