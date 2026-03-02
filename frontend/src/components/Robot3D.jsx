import { lazy, Suspense, Component, useRef, useState, useEffect } from 'react';
import '../App.css';

// ── Carga DIFERIDA del módulo Spline ────────────────────────────────────────
// React.lazy() hace que el bundle de Three.js / @splinetool/runtime
// se descargue solo cuando este componente se monta (code splitting).
// Así, si falla, NO crashea el resto de la app.
const Spline = lazy(() => import('@splinetool/react-spline'));

// ── Error Boundary ──────────────────────────────────────────────────────────
// React solo puede capturar errores de renderizado síncronos con class components.
// Si Spline lanza "Error creating WebGL context", este boundary lo atrapa y
// muestra un fallback elegante en lugar de propagar el error hacia arriba.
class SplineErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log silencioso — no queremos que el error rompa nada más
    console.warn('[Robot3D] Spline/WebGL no disponible en este entorno:', error.message, info);
  }

  render() {
    if (this.state.hasError) {
      // Fallback: placeholder visual que mantiene la estética del panel
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M8 8v1a4 4 0 0 0 8 0V8" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <p className="text-white text-xs tracking-widest uppercase">IA Coach</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Componente principal ────────────────────────────────────────────────────
export default function Robot3D() {
  const containerRef = useRef(null);
  const [canRender, setCanRender] = useState(false);

  // Solo monta Spline cuando el contenedor tiene dimensiones positivas.
  // Previene el error WebGL "zero size framebuffer" en display:none o en SSR.
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanRender(true);
          observer.disconnect();
        }
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] flex justify-center items-center relative overflow-hidden"
    >
      {canRender && (
        <div className="w-full h-[120%] absolute -top-[5%]">
          {/* SplineErrorBoundary captura errores de WebGL / Three.js */}
          <SplineErrorBoundary>
            {/* Suspense muestra un loader mientras se descarga el bundle de Spline */}
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                </div>
              }
            >
              <Spline
                scene="https://prod.spline.design/9dHbiIYbbd-WCjPU/scene.splinecode"
                onError={(e) => {
                  // onError de Spline: errores de red o de carga del .splinecode
                  console.warn('[Robot3D] Error cargando escena Spline:', e);
                }}
              />
            </Suspense>
          </SplineErrorBoundary>
        </div>
      )}
    </div>
  );
}
