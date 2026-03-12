# Informe Técnico — Job Hunter: Problemas de Búsqueda y Calidad de Resultados

**Proyecto:** NEXT — IA Coach de Empleabilidad  
**Módulo:** Job Hunter (`/job-hunter`)  
**Fecha:** 10 de marzo de 2026  
**Estado actual:** En proceso de corrección

---

## 1. Resumen Ejecutivo

El módulo Job Hunter presenta dos problemas críticos que degradan completamente la experiencia del usuario:

1. **Timeout de la API** — La pantalla muestra `Error al cargar vacantes: timeout of 20000ms exceeded`, bloqueando el acceso a cualquier resultado.
2. **Resultados de baja relevancia** — Cuando la búsqueda sí funciona, retorna únicamente ~5 empleos, todos remotos, con porcentajes de compatibilidad menores al 35%, sin relación al perfil del usuario.

---

## 2. Arquitectura del Módulo

```
Frontend (React)                 Backend (Node.js)               APIs Externas
─────────────────                ─────────────────               ──────────────
JobHunter.jsx
  └─ GET /api/jobs/search ──────► jobController.js ─────────────► JSearch (RapidAPI)
                                       │                          ► Remotive (gratuita)
                                       ▼
                               jobMatchService.js
                               (motor de matching IA)
                                       │
                                       ▼
                               Respuesta: top 10 jobs
                               con matchAnalysis {}
```

### Flujo de datos esperado
1. Frontend envía `query` + `location` (opcionales)
2. Backend lee perfil del usuario (área, nivel, skills, CV)
3. Consulta JSearch y Remotive **en paralelo**
4. Aplica filtros de calidad y experiencia
5. Enriquece cada oferta con score de IA (0–100%)
6. Devuelve top 10 ordenadas por compatibilidad

---

## 3. Problemas Identificados

### 3.1 Timeout — `timeout of 20000ms exceeded`

| Atributo | Detalle |
|---|---|
| **Error** | `AxiosError: timeout of 20000ms exceeded` |
| **Origen** | Respuesta de JSearch (RapidAPI) excede los 20 segundos |
| **Causa principal** | JSearch en el plan gratuito/básico de RapidAPI tiene latencia variable y alta bajo carga |
| **Agravante #1** | Se solicitan `num_pages: '2'` (~20 resultados), duplicando el tiempo de respuesta vs `num_pages: '1'` |
| **Agravante #2** | El timeout de 20s en `axios` no deja margen para reintentos |
| **Impacto** | El usuario ve un error y no recibe ningún resultado |

### 3.2 Pool Vacío / Solo 5 Resultados Remotos

| Atributo | Detalle |
|---|---|
| **Síntoma** | 5 de 5 resultados eran empleos remotos de Remotive; 0 de JSearch |
| **Causa #1** | Parámetro `country: 'co'` en JSearch — la base de datos de Colombia en JSearch es mínima, retorna 0 o 1 resultado en la mayoría de búsquedas |
| **Causa #2** | Parámetro `job_requirements` activado en la API — este filtro de JSearch es inconsistente y elimina la mayoría del pool antes de llegar al backend |
| **Causa #3** | `strictExperienceFilter` con regex `(experience)?` **opcional** — bloqueaba ofertas por frases como *"our company has 10 years in business"*, descartando resultados válidos por falsos positivos |
| **Impacto** | Solo sobrevivían las 5–8 ofertas de Remotive; umbral de fallback en `< 5` resultados era demasiado bajo |

### 3.3 Baja Calidad de Matches (Problema previo)

| Atributo | Detalle |
|---|---|
| **Síntoma** | Scores entre 27%–71%, todos en empleos no relacionados con el perfil del usuario |
| **Causa #1** | `React` y `React Native` compartían crédito en el scoring (tecnologías distintas) |
| **Causa #2** | Habilidades blandas (comunicación, liderazgo) inflaban el score hasta +15 puntos |
| **Causa #3** | Sin penalización dura por brecha de experiencia — un perfil junior podía alcanzar 80% en una vacante Senior |
| **Estado** | ✅ Corregido en sesiones anteriores |

---

## 4. Análisis de Causa Raíz

```
Timeout (20s)
    ├─► num_pages: '2' duplica carga
    ├─► Plan gratuito RapidAPI: sin SLA de latencia
    └─► Sin lógica de reintento o degradación graceful

Pool vacío
    ├─► country: 'co' → JSearch Colombia DB = ~0 resultados
    ├─► job_requirements API param → inconsistente, elimina pool
    └─► strictExperienceFilter regex muy agresivo
             └─► (experience)? opcional → falsos positivos masivos
```

---

## 5. Correcciones Aplicadas

### Sesión Actual

| # | Archivo | Cambio |
|---|---|---|
| 1 | `jobController.js` | Eliminado `country: 'co'` de parámetros JSearch |
| 2 | `jobController.js` | Eliminado `job_requirements` del request a JSearch |
| 3 | `jobController.js` | `strictExperienceFilter` regex corregido: `(experience\|experiencia)` ahora es **obligatorio**, no opcional |
| 4 | `jobController.js` | Umbral de fallback subido de `< 5` a `< 8` resultados |

### Sesión Anterior (Motor de Matching)

| # | Archivo | Cambio |
|---|---|---|
| 5 | `jobMatchService.js` | `React` ≠ `React Native`: override compuesto en extracción de skills |
| 6 | `jobMatchService.js` | Soft skills con peso `0.4x` (comunicación, liderazgo, agile) |
| 7 | `jobMatchService.js` | `computeExperienceBlock`: hard cap en score si brecha de experiencia ≥ 4 años |
| 8 | `jobMatchService.js` | Skills en título de la vacante: peso `3x` |
| 9 | `jobController.js` | Remotive integrado como fuente paralela (gratuita, sin API key) |
| 10 | `jobController.js` | Resultados ordenados por compatibilidad IA, no por fecha |

---

## 6. Problema Pendiente: Timeout

El timeout sigue siendo un riesgo activo incluso con los fixes del pool. Se identifican dos soluciones:

### Opción A — Reducir `num_pages` y agregar timeout progresivo *(recomendada, mínimo impacto)*
- Regresar a `num_pages: '1'` para reducir latencia de JSearch a la mitad
- Bajar timeout de 20s a 12s para fallar rápido y activar fallback
- Devolver resultados de Remotive si JSearch falla, en lugar de error total

### Opción B — Reemplazar JSearch con API alternativa

| API | Costo | Latencia | Notas |
|---|---|---|---|
| Adzuna | Gratuita (1k req/día) | ~2–4s | Cobertura global + Colombia |
| The Muse | Gratuita | ~1–3s | Solo EE.UU. |
| Arbeitnow | Gratuita, sin key | ~1–2s | Europa principalmente |
| Remotive | Gratuita, sin key | ~1–2s | Solo remoto ✅ ya integrada |

---

## 7. Estado Actual

| Componente | Estado |
|---|---|
| Motor de matching (IA Score) | ✅ Funcional |
| Filtro de experiencia (regex) | ✅ Corregido |
| Filtros de API (country/job_req) | ✅ Corregidos |
| Fuente Remotive integrada | ✅ Funcional |
| Tabs de filtro UI (Colombia / Remoto) | ✅ Funcional |
| Timeout de JSearch | ⚠️ Pendiente — requiere estrategia de degradación |

---

## 8. Recomendación Inmediata

```
Corto plazo:
  1. Reducir num_pages: '2' → '1'
  2. Reducir timeout axios: 20000ms → 10000ms
  3. Envolver jsearch() en try/catch individual:
     si falla → continuar solo con resultados de Remotive
     (degradación graceful, no error total)

Mediano plazo:
  4. Evaluar migrar a Adzuna API (gratuita, global, confiable)
  5. Implementar caché persistente (Redis) para evitar
     hits a la API en búsquedas repetidas del mismo perfil
```

---

*Informe generado el 10 de marzo de 2026 — Repositorio NEXT v1.0-beta.*
