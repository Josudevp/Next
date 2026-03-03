import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, UserRound, AlertCircle, CheckCircle2 } from 'lucide-react'
import API_URL from '../api/api'
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

    return (
        <div className="flex flex-col justify-center items-center h-screen w-full sm:flex-row relative overflow-hidden">

            {/* ── Logo mobile ─────────────────────────────────── */}
            <div className="sm:hidden absolute top-6 left-6 z-10">
                <LogoNext />
            </div>

            {/* ═══════════════════════════════════════════════════
                PANEL IZQUIERDO — Hero (solo desktop)
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
                    flex justify-center items-center px-6 sm:px-10
                    bg-white flex-1
                    sm:flex-none sm:w-[45%] lg:w-[42%] xl:w-[38%]
                    h-screen
                    sm:bg-[radial-gradient(circle,#69809E_0%,#31445E_100%)]
                    sm:shadow-[-5px_0_30px_rgba(0,0,0,0.25)]
                    relative
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
                                <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
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