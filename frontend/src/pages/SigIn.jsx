import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, UserRound, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import API_URL from '../api/api'

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
import Button from '../components/Button'
import InputField from '../components/InputField'
import SigInImage from '../assets/SigIn/signUpJob.webp'
import LogoNext from '../components/LogoNext'

// ── Helpers de validación ──────────────────────────────────────────────────────
// Para el backend: mover a src/utils/validators.js
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const sanitize = (value) => value.trim()

// ── Medidor de fortaleza de contraseña ────────────────────────────────────────
const getPasswordStrength = (pwd) => {
    if (!pwd) return null
    const checks = [
        pwd.length >= 8,
        /[A-Z]/.test(pwd),
        /[0-9]/.test(pwd),
        /[^A-Za-z0-9]/.test(pwd),
    ]
    const score = checks.filter(Boolean).length
    const levels = [
        { label: 'Muy débil', color: '#EF4444' },
        { label: 'Débil', color: '#F97316' },
        { label: 'Regular', color: '#EAB308' },
        { label: 'Fuerte', color: '#10B981' },
    ]
    return { score, ...levels[Math.min(score - 1, 3)] }
}

const PasswordStrengthBar = ({ password }) => {
    const strength = getPasswordStrength(password)
    if (!strength) return null
    return (
        <div className="px-1 mt-1 mb-2 animate-fade-in">
            <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i <= strength.score ? strength.color : '#E5E7EB' }}
                    />
                ))}
            </div>
            <p className="text-xs font-medium transition-colors" style={{ color: strength.color }}>
                {strength.label}
            </p>
        </div>
    )
}

// ── Componente ─────────────────────────────────────────────────────────────────
const SigIn = () => {
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    })
    const [errores, setErrores] = useState({})
    const [isLoading, setIsLoading] = useState(false)

    // Actualiza campo y borra su error en tiempo real
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
        const name = sanitize(formData.name)
        const email = sanitize(formData.email)
        const { password, confirmPassword } = formData

        if (!name || name.length < 2) errs.name = 'Ingresa tu nombre completo (mín. 2 caracteres).'
        if (!email) errs.email = 'El correo es obligatorio.'
        else if (!isValidEmail(email)) errs.email = 'Ingresa un correo válido.'
        if (!password) errs.password = 'La contraseña es obligatoria.'
        else if (password.length < 8) errs.password = 'La contraseña debe tener al menos 8 caracteres.'
        if (password !== confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden.'

        return errs
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setErrores(errs); return }

        setIsLoading(true)
        setErrores({})

        try {
            const name = sanitize(formData.name)
            const email = sanitize(formData.email)
            const password = formData.password

            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            })

            const data = await response.json()

            if (!response.ok) {
                // Manejar errores (ej. 400 - correo ya en uso)
                setErrores({ global: data.mensaje || 'Error al registrar usuario' })
                return
            }

            // Éxito — nuevo usuario va siempre a onboarding primero
            localStorage.setItem('next_token', data.token)
            localStorage.setItem('next_user', JSON.stringify(data.user))
            localStorage.setItem('next_session', 'true')

            // Primer destino obligatorio: onboarding para completar el perfil
            navigate('/onboarding', { replace: true })
        } catch (error) {
            console.error('Error en registro:', error)
            setErrores({ global: 'Error de conexión con el servidor.' })
        } finally {
            setIsLoading(false)
        }
    }

    const googleSignIn = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true)
            setErrores({})
            try {
                const response = await fetch(`${API_URL}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken: tokenResponse.access_token }),
                })
                const data = await response.json()
                if (!response.ok) {
                    setErrores({ global: data.mensaje || 'Error al registrarse con Google' })
                    return
                }
                localStorage.setItem('next_token', data.token)
                localStorage.setItem('next_user', JSON.stringify(data.user))
                localStorage.setItem('next_session', 'true')
                navigate(data.needsOnboarding ? '/onboarding' : '/dashboard', { replace: true })
            } catch (err) {
                console.error('[Google SignIn]', err)
                setErrores({ global: 'Error al conectar con Google. Intenta de nuevo.' })
            } finally {
                setIsLoading(false)
            }
        },
        onError: () => setErrores({ global: 'Registro con Google cancelado.' }),
    })

    return (
        <div className="relative flex min-h-dvh w-full flex-col sm:flex-row sm:overflow-hidden">

            {/* ── Logo mobile ─────────────────────────────────── */}
            <div className="sm:hidden absolute top-6 left-6 z-10">
                <LogoNext />
            </div>

            {/* ═══════════════════════════════════════════════════
                PANEL IZQUIERDO — Hero (solo desktop)
            ══════════════════════════════════════════════════════ */}
            <section
                aria-label="Sección informativa"
                className="hidden sm:flex flex-1 flex-col min-h-dvh text-center px-8 py-8"
            >
                <div className="mb-auto">
                    <LogoNext />
                </div>
                <div className="flex flex-col items-center justify-center gap-6 flex-1">
                    <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 text-pretty px-4 leading-snug">
                        Empieza a avanzar <br />
                        <span className="font-medium text-gray-500 text-xl lg:text-2xl text-pretty">
                            Muestra tus habilidades y conecta con oportunidades reales de{' '}
                            <span className="text-[#4ADE80] font-semibold">empleo</span>
                        </span>
                    </h1>
                    <img
                        src={SigInImage}
                        alt="Persona registrándose para buscar empleo"
                        className="w-full max-w-72 lg:max-w-104 xl:max-w-120 drop-shadow-sm"
                    />
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                PANEL DERECHO — Formulario
            ══════════════════════════════════════════════════════ */}
            <aside
                aria-label="Panel de registro"
                className="
                    flex justify-center items-start sm:items-center px-6 sm:px-10
                    bg-white flex-1
                    sm:flex-none sm:w-[45%] lg:w-[42%] xl:w-[38%]
                    min-h-dvh
                    sm:bg-[radial-gradient(circle,#69809E_0%,#31445E_100%)]
                    sm:shadow-[-5px_0_30px_rgba(0,0,0,0.25)]
                    pt-20 pb-10 sm:py-0 relative
                "
            >
                {/* Elementos decorativos — solo desktop */}
                <div className="hidden sm:block absolute bottom-16 -right-14 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                <div className="hidden sm:block absolute top-20  -left-10  w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

                {/* Tarjeta del formulario */}
                <div className="
                    bg-white sm:py-8 sm:px-10 md:px-12
                    rounded-2xl text-center
                    flex flex-col gap-y-4
                    w-full max-w-md
                    shadow-[0_4px_24px_rgba(0,0,0,0.06)]
                    animate-fade-in-up
                ">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Crear cuenta</h2>
                        <p className="text-gray-400 text-sm mt-1">Tu Instructor IA te espera</p>
                    </div>

                    <hr className="border-gray-100" />

                    <form
                        onSubmit={handleSubmit}
                        noValidate
                        aria-label="Formulario de registro"
                    >
                        {/* Error global (ej. correo ya en uso) */}
                        {errores.global && (
                            <div
                                role="alert"
                                className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 mb-3 text-left animate-fade-in"
                            >
                                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-600 text-sm">{errores.global}</p>
                            </div>
                        )}

                        <InputField
                            type="text"
                            placeholder="Nombre completo"
                            Icono={UserRound}
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            error={errores.name}
                            autoComplete="name"
                            maxLength={60}
                            required
                        />
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
                            autoComplete="new-password"
                            maxLength={128}
                            required
                        />

                        {/* Medidor de fortaleza de contraseña */}
                        <PasswordStrengthBar password={formData.password} />

                        <InputField
                            type="password"
                            placeholder="Confirmar contraseña"
                            Icono={Lock}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            error={errores.confirmPassword}
                            autoComplete="new-password"
                            maxLength={128}
                            required
                        />

                        {/* Indicador de coincidencia de contraseñas */}
                        {formData.confirmPassword && !errores.confirmPassword && (
                            <div className="flex items-center gap-1.5 ml-1 mb-1 animate-fade-in">
                                {formData.password === formData.confirmPassword
                                    ? <><CheckCircle2 size={13} className="text-green-500" /><p className="text-green-500 text-xs">Las contraseñas coinciden</p></>
                                    : <><AlertCircle size={13} className="text-orange-400" /><p className="text-orange-400 text-xs">Las contraseñas no coinciden aún</p></>
                                }
                            </div>
                        )}

                        <div className="mt-6">
                            <Button
                                text="Crear cuenta"
                                type="submit"
                                loading={isLoading}
                            />
                        </div>
                    </form>

                    {/* ── Divisor y botón Google (solo si está configurado) ── */}
                    {GOOGLE_ENABLED && (<>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-xs text-gray-400 font-medium">o regístrate con</span>
                        <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* ── Botón Google ── */}
                    <button
                        type="button"
                        onClick={() => googleSignIn()}
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
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="font-semibold text-next-primary hover:underline">
                            Iniciar sesión
                        </Link>
                    </p>
                </div>
            </aside>
        </div>
    )
}

export default SigIn