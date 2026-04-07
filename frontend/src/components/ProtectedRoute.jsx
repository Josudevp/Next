import { Navigate, useLocation } from 'react-router-dom'
import { isTokenValid } from '../utils/auth'

/**
 * ProtectedRoute — Guardia de rutas privadas
 *
 * [FIX #3] Ahora valida la expiración real del JWT en el cliente
 * decodificando el campo `exp` del payload. Antes solo verificaba
 * la existencia de las claves en localStorage, lo que permitía que
 * un token expirado pasara el guard y causara un flicker al montar
 * el componente antes de recibir el 401 del backend.
 *
 * Uso en App.jsx:
 *   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 */
const ProtectedRoute = ({ children }) => {
    const location = useLocation()

    const session = localStorage.getItem('next_session')

    // isTokenValid() decodifica el JWT y compara exp * 1000 con Date.now()
    const isAuthenticated = isTokenValid() && !!session

    if (!isAuthenticated) {
        // Limpiar sesión si el token expiró para no dejar claves huérfanas
        if (!isTokenValid()) {
            localStorage.removeItem('next_token')
            localStorage.removeItem('next_session')
            localStorage.removeItem('next_user')
        }
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location.pathname }}
            />
        )
    }

    return children
}

export default ProtectedRoute
