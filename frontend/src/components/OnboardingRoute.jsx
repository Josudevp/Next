import { Navigate, useLocation } from 'react-router-dom'
import { isTokenValid } from '../utils/auth'

/**
 * Verifica si el perfil cacheado tiene los campos mínimos del onboarding.
 * [FIX #4] Si el perfil es null (corrupto o eliminado manualmente), devuelve
 * false y deja que el usuario complete el onboarding normalmente, en vez de
 * causar un redirect loop bloqueando el acceso al dashboard.
 */
const hasCompletedOnboarding = (profile) => {
    if (!profile) return false  // null-safe: perfil ausente = no completado
    const skillsCount = Array.isArray(profile.skills) ? profile.skills.length : 0
    const goalsCount = Array.isArray(profile.goals) ? profile.goals.length : 0
    return Boolean(profile.area && profile.jobType && skillsCount > 0 && goalsCount > 0)
}

const safeParse = (value) => {
    try {
        return JSON.parse(value || 'null')
    } catch {
        // [FIX #4] JSON malformado (ej. escritura incompleta por crash) → null
        // Antes podía causar que hasCompletedOnboarding recibiera undefined
        // y evaluara incorrectamente el estado del usuario.
        return null
    }
}

const OnboardingRoute = ({ children }) => {
    const location = useLocation()
    const session = localStorage.getItem('next_session')

    // [FIX #4] Usar isTokenValid() en lugar de solo verificar existencia del token
    if (!isTokenValid() || !session) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }

    const cachedProfile = safeParse(localStorage.getItem('next_profile'))
    const onboardingCompleted = localStorage.getItem('next_onboarding_completed') === 'true'

    // Si el onboarding ya está marcado como completo O el perfil tiene los datos
    // requeridos, redirigir al dashboard.
    if (onboardingCompleted || hasCompletedOnboarding(cachedProfile)) {
        return <Navigate to="/dashboard" replace />
    }

    // [FIX #4] Si cachedProfile es null pero el token es válido, permitir el
    // acceso al onboarding. No asumir que "sin perfil = loop de redirect".
    return children
}

export default OnboardingRoute
