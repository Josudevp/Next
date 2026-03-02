import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 30000,
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
