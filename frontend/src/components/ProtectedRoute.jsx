import { Navigate, useLocation } from 'react-router-dom'

/**
 * ProtectedRoute — Guardia de rutas privadas
 *
 * Verifica que existan AMBAS claves de sesión antes de renderizar
 * el contenido protegido. Si falta cualquiera, redirige a /login.
 *
 * Uso en App.jsx:
 *   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 *
 * El estado `from` preserva la ruta que el usuario intentaba visitar,
 * para que Login pueda redirigirlo allí después de autenticarse.
 */
const ProtectedRoute = ({ children }) => {
    const location = useLocation()

    const token = localStorage.getItem('next_token')
    const session = localStorage.getItem('next_session')

    const isAuthenticated = !!(token && session)

    if (!isAuthenticated) {
        // replace:true evita que /dashboard quede en el historial
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
