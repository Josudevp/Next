import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
import API_URL from '../api/api'
import InputField from '../components/InputField'
import Button from '../components/Button'
import LogoNext from '../components/LogoNext'

const ResetPassword = () => {
  const navigate = useNavigate()
  const { token } = useParams()

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.password) {
      setError('La nueva contraseña es obligatoria.')
      return
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formData.password }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.mensaje || 'No se pudo restablecer la contraseña.')
        return
      }
      setSuccess(data.mensaje || 'Contraseña actualizada correctamente.')
      setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (requestError) {
      console.error('Error en reset password:', requestError)
      setError('Error de conexión con el servidor.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-8">
        <div className="mb-8 flex justify-center">
          <LogoNext />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-2">
            Define una nueva contraseña para tu cuenta de NEXT.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 mb-3">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-3 mb-3">
              <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-700 text-sm">{success}</p>
            </div>
          )}

          <InputField
            type="password"
            placeholder="Nueva contraseña"
            Icono={Lock}
            name="password"
            value={formData.password}
            onChange={handleChange}
            error=""
            autoComplete="new-password"
            maxLength={128}
            required
          />

          <InputField
            type="password"
            placeholder="Confirmar contraseña"
            Icono={Lock}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={error && !success ? error : ''}
            autoComplete="new-password"
            maxLength={128}
            required
          />

          <div className="mt-5">
            <Button text="Restablecer contraseña" type="submit" loading={isLoading} />
          </div>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          <Link to="/login" className="font-semibold text-[#2563EB] hover:underline">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword