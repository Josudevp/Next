import axios from 'axios';

// En producción (Render): VITE_API_URL = https://next-backend.onrender.com
// En local (XAMPP): el proxy de vite.config.js redirige /api → localhost:5000
const API_BASE = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

const axiosInstance = axios.create({
    baseURL: API_BASE,
    timeout: 90000, // 90s — necesario para reportes con gemini-2.5-pro (análisis profundo)
    headers: { 'Content-Type': 'application/json' },
});

// ── REQUEST INTERCEPTOR: adjuntar token automáticamente ──
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('next_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR: manejar 401 sin bucles ──
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Limpiar sesión y redirigir al login una sola vez
            localStorage.removeItem('next_token');
            localStorage.removeItem('next_user');

            // Evitar bucle si ya estamos en /login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
