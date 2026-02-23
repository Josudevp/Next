/**
 * Button — Botón primario de NEXT.
 *
 * Props:
 *  - text     : string   — texto del botón
 *  - type     : string   — tipo HTML ('button' | 'submit') — default: 'button'
 *  - loading  : boolean  — muestra spinner y deshabilita el botón
 *  - disabled : boolean  — deshabilita sin spinner
 *  - onClick  : fn       — manejador de clic (para uso fuera de formularios)
 *  - accion   : fn       — alias legacy de onClick (compatibilidad con Home)
 *  - fullWidth: boolean  — ocupa el 100% del ancho — default: true
 */
const Button = ({
    text,
    type = 'button',
    loading = false,
    disabled = false,
    onClick,
    accion,           // alias legacy
    fullWidth = true,
}) => {
    const isDisabled = loading || disabled
    const handleClick = onClick || accion

    return (
        <button
            type={type}
            onClick={!isDisabled ? handleClick : undefined}
            disabled={isDisabled}
            aria-busy={loading}
            className={`
                inline-flex items-center justify-center gap-2
                px-14 py-3 md:py-4 rounded-2xl md:rounded-4xl
                font-semibold text-sm md:text-base
                text-white bg-linear-to-r from-[#1B49AE] from-40% via-[#3473FF] via-80% to-next-primary to-100%
                transition-all duration-200
                ${fullWidth ? 'w-full' : ''}
                ${isDisabled
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]'
                }
            `}
        >
            {loading ? (
                <>
                    {/* Spinner SVG inline — sin dependencia de librería */}
                    <svg
                        className="animate-spin h-4 w-4 text-white flex-shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 12h4a8 8 0 01-8 8z" />
                    </svg>
                    Procesando...
                </>
            ) : text}
        </button>
    )
}

export default Button
