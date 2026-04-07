/**
 * auth.js — Utilidades de autenticación en el cliente
 *
 * Centraliza la lógica de validación de sesión para que ProtectedRoute
 * y OnboardingRoute no dupliquen código.
 */

/**
 * isTokenValid — Verifica si el JWT en localStorage no ha expirado.
 *
 * Decodifica el payload del JWT (sin verificar la firma — eso es tarea
 * del backend). Solo comprueba el campo `exp` para evitar dejar entrar
 * a un usuario con un token caducado antes de que la API devuelva 401.
 *
 * @returns {boolean} true si el token existe y no ha expirado
 */
export const isTokenValid = () => {
    const token = localStorage.getItem('next_token')
    if (!token) return false
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return false
        // El payload es la segunda parte del JWT, codificado en base64url
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (!payload.exp) return true // Sin `exp` asumimos indefinido — tratar como válido
        // exp está en segundos UNIX, Date.now() en milisegundos
        return payload.exp * 1000 > Date.now()
    } catch {
        // Si el token está malformado, no es válido
        return false
    }
}

/**
 * clearSession — Elimina todas las claves de sesión de localStorage.
 * Útil para logout centralizado.
 */
export const clearSession = () => {
    localStorage.removeItem('next_token')
    localStorage.removeItem('next_user')
    localStorage.removeItem('next_session')
    localStorage.removeItem('next_profile')
    localStorage.removeItem('next_onboarding_completed')
}
