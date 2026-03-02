import Spline from '@splinetool/react-spline';
import { useRef, useState, useEffect } from 'react';
import '../App.css';

export default function Robot3D() {
  const containerRef = useRef(null);
  const [canRender, setCanRender] = useState(false);

  // Solo monta Spline cuando el contenedor tiene dimensiones positivas.
  // Previene los errores WebGL "zero size framebuffer" al renderizar en display:none.
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanRender(true);
          observer.disconnect(); // basta con la primera vez
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
          <Spline scene="https://prod.spline.design/9dHbiIYbbd-WCjPU/scene.splinecode" />
        </div>
      )}
    </div>
  );
}

