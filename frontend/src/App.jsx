import { Component } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

// ── Páginas públicas ──────────────────────────────────────────────────────────
import Home from './pages/Home'
import Login from './pages/Login'
import SigIn from './pages/SigIn'

// ── Páginas privadas ──────────────────────────────────────────────────────────
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import IACoach from './pages/IACoach'

// ── Guardia de rutas ──────────────────────────────────────────────────────────
import ProtectedRoute from './components/ProtectedRoute'

// ── Error Boundary Global ─────────────────────────────────────────────────────
// Captura cualquier error de renderizado no controlado en producción
// (ej. WebGL, importaciones fallidas) y evita la pantalla en blanco.
class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[GlobalErrorBoundary] Error no controlado:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
              fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
            <p className="text-gray-500 text-sm max-w-sm">
              Ocurrió un error inesperado. Intenta recargar la página.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <GlobalErrorBoundary>
      <BrowserRouter>
        <Routes>

          {/* ── Rutas PÚBLICAS — accesibles sin sesión ── */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signin" element={<SigIn />} />

          {/* ── Rutas PRIVADAS — requieren next_token + next_session ── */}
          <Route path="/onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/ia-coach" element={
            <ProtectedRoute><IACoach /></ProtectedRoute>
          } />

        </Routes>
      </BrowserRouter>
    </GlobalErrorBoundary>
  )
}

export default App
