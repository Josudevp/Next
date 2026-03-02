import { lazy, Suspense, Component, useRef, useState, useEffect } from 'react';
import '../App.css';

const Spline = lazy(() => import('@splinetool/react-spline'));

// ── Comprobación nativa de WebGL ────────────────────────────────────────────
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// ── Error Boundary local ────────────────────────────────────────────────────
class SplineErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('[Robot3D] Fallo crítico de WebGL:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackUI />;
    }
    return this.props.children;
  }
}

// ── UI de Respaldo cuando no hay 3D ─────────────────────────────────────────
const FallbackUI = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#F8FAFC] rounded-3xl border border-gray-200 shadow-inner px-6 text-center">
    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
    </div>
    <div>
      <h3 className="text-gray-900 font-bold text-lg">IA Coach 3D</h3>
      <p className="text-sm text-gray-500 max-w-[250px] mt-1">
        La aceleración gráfica (WebGL) de tu navegador está desactivada. Actívala para ver el simulador 3D.
      </p>
    </div>
  </div>
);

// ── Componente principal ────────────────────────────────────────────────────
export default function Robot3D() {
  const containerRef = useRef(null);
  const [canRender, setCanRender] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    // 1. Verificamos soporte a nivel de hardware/browser
    if (!isWebGLAvailable()) {
      setHasWebGL(false);
      return;
    }

    // 2. Control de renderizado para evitar errores si no hay tamaño
    const el = containerRef.current;
    if (!el) return;

    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) {
      setCanRender(true);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setCanRender(true);
          observer.disconnect();
          return;
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Si no hay WebGL, ni siquiera intentamos montar Spline
  if (!hasWebGL) {
    return (
      <div className="w-full h-[400px] flex justify-center items-center p-4">
        <FallbackUI />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] flex justify-center items-center relative overflow-hidden">
      {canRender && (
        <div className="w-full h-[120%] absolute -top-[5%]">
          <SplineErrorBoundary>
            <Suspense fallback={
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm text-blue-500/60 font-medium">Cargando 3D...</span>
              </div>
            }>
              <Spline
                scene="https://prod.spline.design/9dHbiIYbbd-WCjPU/scene.splinecode"
                onError={(e) => console.warn('[Robot3D] Error de carga Spline:', e)}
              />
            </Suspense>
          </SplineErrorBoundary>
        </div>
      )}
    </div>
  );
}
