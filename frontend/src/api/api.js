/**
 * api.js — URL base del backend
 *
 * Vite reemplaza `import.meta.env.VITE_API_URL` en build time.
 * - Producción (Render): apunta al servicio next-backend.onrender.com
 * - Local: usa el proxy de vite.config.js → /api → localhost:5000
 */
const API_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

export default API_URL;
