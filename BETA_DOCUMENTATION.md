# Documentación de la Beta de NEXT 🚀

Esta documentación resume todas las características, rediseños y configuraciones desarrolladas para la versión Beta de la plataforma NEXT, una aplicación integral para la empleabilidad universitaria.

---

## 🏗️ Arquitectura General (Frontend Beta)

El objetivo de la Beta es ofrecer un flujo continuo y pulido (_pixel-perfect_, enfocado en UX) simulando las interacciones del backend mediante **`localStorage`**. Esto permite validar la experiencia de usuario (Auth 👉 Onboarding 👉 Dashboard) de inmediato sin depender de una API funcional.

### Estructura de Datos Simulada (Local Storage)
- **`next_user`**: Almacena `{ name, email }` (Datos permanentes de cuenta. ¡Nunca guarda la contraseña por seguridad!).
- **`next_profile`**: Almacena todo el perfil del Onboarding `{ area, situation, jobType, skills[], goals[] }` (Datos de la ruta del usuario).
- **`next_session`**: Almacena `'true'` cuando el usuario tiene una sesión activa (Token efímero para el guard de rutas).

---

## 🎨 Design System y Componentes Base

1.  **Estilo Global (`index.css`)**:
    *   Integración de fuente **Inter** (estándar de la industria para interfaces limpias).
    *   **Scrollbars personalizadas (`thin`)** coherentes con la paleta de la marca (azul claro).
    *   Micro-animaciones globales (`fadeInUp`, `fadeIn`) para entradas fluidas de elementos.

2.  **`InputField.jsx`**:
    *   Componente universal reconstruido desde cero.
    *   Soporte completo de **Accesibilidad (ARIA)**.
    *   **Seguridad**: Atributos `maxLength` y `autoComplete` estrictos.
    *   Estado visual de error dinámico (borde rojo + mensaje animado).
    *   *Toggle* nativo para descubrir/ocultar contraseñas (`Eye` / `EyeOff`).

3.  **`Button.jsx`**:
    *   Soporte de gradiente corporativo (`#1B49AE` → `#2563EB`).
    *   Manejo de estados dinámicos (`disabled`, `loading` con spinner integrado).
    *   Micro-interacciones en hover y active (`scale-[1.01]`, `active:scale-[0.99]`).

---

## 🔐 Flujo de Autenticación (Auth)

Ambas pantallas (`SigIn.jsx` y `Login.jsx`) fueron llevadas a un nivel de producción con diseño de pantalla dividida (Split Screen) y fondos consistentes.

### Registro (`SigIn.jsx`)
- **Validaciones en tiempo real**: Nombre asertivo, formato regex de correo, contraseñas coincidentes y longitud mínima.
- **Seguridad visual**: Medidor de fortaleza de contraseña (4 niveles por colores).
- **Lógica**: Al registrar, guarda `next_user`, establece `next_session` en crudo y redirige a la creación del perfil (`/onboarding`).

### Inicio de Sesión (`Login.jsx`)
- **Gestión de Sesión**: Compara con el `localStorage`. Si el correo coincide (ignorando mayúsculas y espacios gracias a `sanitize()`) se activa `next_session`.
- **Enrutamiento Inteligente**: Si el usuario ya tiene su `next_profile` guardado va directo al `/dashboard`, sino, se le fuerza a pasar por el `/onboarding`.

---

## 📝 Onboarding Flow

Interfaz interactiva de 5 pasos a pantalla completa (`100vh`) sin scrollbars excesivas, usando un grid de 3 columnas para maximizar el uso del espacio.

**Pasos del Perfilamiento:**
1.  **Área de formación**: 11 opciones (Ingeniería, Salud, Negocios, etc.) + opción "Otra área" (UX Escape Hatch).
2.  **Situación Académica**: Desde "cursando" hasta "búsqueda activa".
3.  **Tipo de Oportunidad**: Pasantía, remoto, part-time, etc.
4.  **Habilidades**: Selección múltiple dinámica. (Las habilidades mostradas varían según el Área seleccionada en el paso 1).
5.  **Metas con NEXT**: Selección múltiple (Ej. "Mejorar CV", "Prepararme para entrevistas").

*Terminar el flujo compila toda la información en un objeto JSON y lo guarda en `next_profile`.*

---

## 📊 Dashboard y Vistas Internas

El centro de operaciones hiper-personalizado que recibe al usuario tras el login/onboarding.

### `Dashboard.jsx`
- **Auth Guard Fuerte**: Bloquea el acceso si no existe `next_session` o `next_user`.
- **Top Bar**: Navegación `sticky`, campana de notificaciones (estética) y **Avatar interactivo** auto-generado con las iniciales del usuario para realizar Logout.
- **Score Dinámico (SVG Circular)**: Gráfico circular animado (0 a 100%) cuyo cálculo es matemático basado en la longitud de habilidades, situación y metas seleccionadas en el onboarding.
- **Tarjetas de Acción**:
    - *Nivel de Empleabilidad*.
    - *Crecer Empleabilidad* (Misiones gamificadas con porcentajes +5%).
    - *IA Coach* (CTA activo hacia la herramienta).
    - *Job Hunter* (Bloqueado con estado "Próximamente").
- **Banner "Habilidad de la Semana"**: Destaca la primera habilidad del perfil del usuario animándolo a mejorarla de forma interactiva.

### `IACoach.jsx` (Vista "Coming Soon")
- Demostración visual de la promesa de valor: Generador de CV, Simulador y Análisis de brecha.
- Misma línea gráfica, navegación para regresar al Dashboard, listos para conectar la API de Gemini.

---

## 🛠️ Próximos pasos (Preparación para Backend Reál / Node.js)

Todo el frontend está modularizado de tal manera que reemplazar `localStorage` por Endpoints reales (`fetch`/`axios`) es trivial:

1.  En `SigIn.jsx` → Sustituir `localStorage.setItem` por `POST /api/auth/register`.
2.  En `Login.jsx` → Sustituir validación por `POST /api/auth/login` (recibir e inyectar JWT token).
3.  En `Onboarding.jsx` → Sustituir guardado final por `POST /api/users/profile`.
4.  En `Dashboard.jsx` → Recuperar info desde `GET /api/users/me` y cálculo desde `GET /api/users/score`.

La Beta queda de esta forma completamente **lista para ser demostrada, validada a nivel negocio y transicionada sin fricción a código Full-stack**.
