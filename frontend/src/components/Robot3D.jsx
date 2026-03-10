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

// ── Detección de hardware de gama baja ──────────────────────────────────────
// Capas de señales (de mayor a menor soporte de browser):
//
//  UNIVERSAL (Chrome · Firefox · Safari · Edge · Android · iOS):
//    hardwareConcurrency  → núcleos lógicos
//    prefers-reduced-motion → preferencia de accesibilidad del OS
//    Micro-benchmark JS   → tiempo real de ejecución en el dispositivo
//
//  CHROME / EDGE sólo (undefined en Firefox/Safari, código lo tolera):
//    navigator.deviceMemory  → GB de RAM reportados
//    navigator.connection    → calidad de red
//
// Se ejecuta DENTRO de useEffect (post-paint), por lo que el benchmark
// síncrono (~200k operaciones) no bloquea el primer fotograma visible.
function isLowEndDevice() {
  // ① Preferencia de accesibilidad del OS — el primer check, sin coste (universal)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;

  // ② ≤ 2 GB RAM (Chrome/Edge — omitido en Firefox/Safari)
  const ram = navigator?.deviceMemory;
  if (ram !== undefined && ram <= 2) return true;

  // ③ ≤ 2 núcleos lógicos — universal, iOS/Android/desktop
  const cores = navigator?.hardwareConcurrency;
  if (cores !== undefined && cores <= 2) return true;

  // ④ Conexión muy lenta (Chrome/Edge — omitido en Firefox/Safari)
  const conn = navigator?.connection;
  if (conn && ['slow-2g', '2g'].includes(conn.effectiveType)) return true;

  // ⑤ Micro-benchmark puro de JS — funciona en TODOS los browsers
  //    Mide 200 000 operaciones √; resultados típicos:
  //      Desktop moderno / iPhone reciente   →  < 6 ms
  //      Gama media Android                  →  10–25 ms
  //      Dispositivo lento (Mediatek entry)  →  40–120 ms
  //    Umbral 40 ms cubre el segmento crítico sin generar falsos positivos
  //    en dispositivos de gama media.
  const t = performance.now();
  let _x = 0;
  for (let i = 0; i < 200_000; i++) _x += Math.sqrt(i);
  void _x; // evitar que el optimizador elimine el bucle
  if (performance.now() - t > 40) return true;

  return false;
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

// ── UI de Respaldo: WebGL no disponible ─────────────────────────────────────
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

// ── UI de Respaldo: hardware insuficiente ───────────────────────────────────
const LowEndFallback = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#F8FAFC] rounded-3xl border border-gray-200 shadow-inner px-6 text-center">
    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
      {/* Ícono de relámpago / modo ahorro */}
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </div>
    <div>
      <h3 className="text-gray-900 font-bold text-lg">IA Coach</h3>
      <p className="text-sm text-gray-500 max-w-[250px] mt-1">
        El modelo 3D fue desactivado automáticamente para mantener la página fluida en tu dispositivo.
      </p>
    </div>
  </div>
);

// ── Componente principal ────────────────────────────────────────────────────
export default function Robot3D() {
  const containerRef = useRef(null);
  const [canRender, setCanRender] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    // 1. Detección de hardware — primero, antes de tocar WebGL
    if (isLowEndDevice()) {
      setIsLowEnd(true);
      return;
    }

    // 2. Verificamos soporte a nivel de hardware/browser
    if (!isWebGLAvailable()) {
      setHasWebGL(false);
      return;
    }

    // 3. Control de renderizado para evitar errores si no hay tamaño
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

  // Dispositivo de gama baja → mostramos fallback sin intentar cargar Spline
  if (isLowEnd) {
    return (
      <div className="w-full h-[400px] flex justify-center items-center p-4">
        <LowEndFallback />
      </div>
    );
  }

  // Sin WebGL → fallback específico
  if (!hasWebGL) {
    return (
      <div className="w-full h-[400px] flex justify-center items-center p-4">
        <FallbackUI />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-[280px] sm:min-h-[380px] md:min-h-[500px] flex justify-center items-center relative overflow-hidden">
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
