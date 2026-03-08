import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import API_URL from '../api/api'
import InputField from '../components/InputField'
import Button from '../components/Button'
import LogoNext from '../components/LogoNext'

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('El correo es obligatorio.')
      return
    }
    if (!isValidEmail(cleanEmail)) {
      setError('Ingresa un correo válido.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.mensaje || 'No se pudo enviar el correo.')
        return
      }
      setSuccess(data.mensaje || 'Revisa tu correo para continuar.')
    } catch (requestError) {
      console.error('Error en forgot password:', requestError)
      setError('Error de conexión con el servidor.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-5 py-12 md:px-6">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.06)] px-8 py-10 md:px-10 md:py-12">
        <div className="mb-10 flex justify-center">
          <LogoNext />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed max-w-sm mx-auto">
            Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5">
              <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-700 text-sm">{success}</p>
            </div>
          )}

          <InputField
            type="email"
            placeholder="Correo electrónico"
            Icono={Mail}
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error && !success ? error : ''}
            autoComplete="email"
            maxLength={254}
            required
          />

          <div className="py-5 px-6">
            <Button text="Enviar enlace" type="submit" loading={isLoading} />
          </div>
        </form>

        <p className="text-sm text-gray-500 text-center mt-8">
          <Link to="/login" className="font-semibold text-[#2563EB] hover:underline">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword