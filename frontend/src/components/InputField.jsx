import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

/**
 * InputField — Componente reutilizable de campo de formulario.
 *
 * Props:
 *  - type          : string  — tipo HTML ('text', 'email', 'password')
 *  - placeholder   : string  — texto de placeholder
 *  - name          : string  — nombre del campo (para handleChange)
 *  - value         : string  — valor controlado
 *  - onChange      : fn      — manejador de cambio
 *  - Icono         : component — icono Lucide para el lado izquierdo
 *  - error         : string  — mensaje de error (omitir si no hay error)
 *  - autoComplete  : string  — pista al navegador para autocompletar
 *  - maxLength     : number  — límite de caracteres (seguridad básica)
 *  - required      : boolean — campo requerido (accesibilidad + HTML5)
 *
 * Nota: Los campos de tipo 'password' incluyen toggle show/hide integrado.
 * Para el backend: agregar prop `id` para vincular <label htmlFor> externo.
 */
const InputField = ({
    type = 'text',
    placeholder,
    name,
    value,
    onChange,
    Icono,
    error,
    autoComplete,
    maxLength = 100,
    required = false,
}) => {
    const [showPassword, setShowPassword] = useState(false)

    const isPassword = type === 'password'
    const resolvedType = isPassword && showPassword ? 'text' : type

    return (
        <div className="mb-1">
            <label
                className={`
                    flex items-center gap-2.5 border rounded-xl px-3.5 py-3 mt-4
                    transition-all duration-200 cursor-text
                    ${error
                        ? 'border-red-400 bg-red-50/60 shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
                        : 'border-gray-200 bg-white hover:border-gray-300 focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]'
                    }
                `}
            >
                {/* Icono izquierdo */}
                {Icono && (
                    <Icono
                        size={17}
                        className={`flex-shrink-0 transition-colors duration-200 ${error ? 'text-red-400' : 'text-gray-300'
                            }`}
                        aria-hidden="true"
                    />
                )}

                {/* Input */}
                <input
                    type={resolvedType}
                    placeholder={placeholder}
                    name={name}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    maxLength={maxLength}
                    required={required}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${name}-error` : undefined}
                    className="flex-1 bg-transparent focus:outline-none text-gray-800 text-sm placeholder:text-gray-300 min-w-0"
                />

                {/* Toggle mostrar / ocultar contraseña */}
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        tabIndex={-1}
                        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors duration-150 cursor-pointer p-0.5 rounded"
                    >
                        {showPassword
                            ? <EyeOff size={16} aria-hidden="true" />
                            : <Eye size={16} aria-hidden="true" />
                        }
                    </button>
                )}
            </label>

            {/* Mensaje de error accesible */}
            {error && (
                <div
                    id={`${name}-error`}
                    role="alert"
                    className="flex items-center gap-1.5 mt-1.5 ml-1 animate-fade-in"
                >
                    <AlertCircle size={12} className="text-red-400 flex-shrink-0" aria-hidden="true" />
                    <p className="text-red-500 text-xs">{error}</p>
                </div>
            )}
        </div>
    )
}

export default InputField
