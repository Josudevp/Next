import { Navigate, useLocation } from 'react-router-dom'

const hasCompletedOnboarding = (profile) => {
    const skillsCount = Array.isArray(profile?.skills) ? profile.skills.length : 0
    const goalsCount = Array.isArray(profile?.goals) ? profile.goals.length : 0

    return Boolean(profile?.area && profile?.jobType && skillsCount > 0 && goalsCount > 0)
}

const safeParse = (value) => {
    try {
        return JSON.parse(value || 'null')
    } catch {
        return null
    }
}

const OnboardingRoute = ({ children }) => {
    const location = useLocation()
    const token = localStorage.getItem('next_token')
    const session = localStorage.getItem('next_session')
    const cachedProfile = safeParse(localStorage.getItem('next_profile'))
    const onboardingCompleted = localStorage.getItem('next_onboarding_completed') === 'true'

    if (!(token && session)) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }

    if (onboardingCompleted || hasCompletedOnboarding(cachedProfile)) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}

export default OnboardingRoute
