# Informe Técnico v2 — Job Hunter: Estado Actual y Roadmap

**Proyecto:** NEXT — IA Coach de Empleabilidad  
**Módulo:** Job Hunter (`/job-hunter`)  
**Fecha:** 10 de marzo de 2026  
**Versión anterior:** `informe-job-hunter.md`

---

## 1. Resumen de Sesión

### Lo que se logró hoy
- ✅ Motor de matching IA completamente funcional (scores: 27%–96%)
- ✅ Migración completa de JSearch → Adzuna + Remotive + Jobicy
- ✅ 10 resultados relevantes con compatibilidad IA ordenados de mayor a menor
- ✅ Timeout resuelto (de 20s sin respuesta → ~4s con resultados)
- ✅ Tab "Remoto" funcional en el UI
- ✅ Logos de empresa con fallback avatar cuando la imagen falla

### Estado de las fuentes activas

| Fuente | Estado | Resultados | Tipo empleo | Requiere key |
|---|---|---|---|---|
| **Adzuna US** | ⚠️ 429 en dev (rate limit) | 0–20 | Remoto (forzado) | ✅ Sí (gratuita) |
| **Adzuna GB** | ⚠️ 429 en dev (rate limit) | 0–10 | Remoto (forzado) | ✅ Sí (gratuita) |
| **Remotive** | ✅ Funcional | 15 | 100% Remoto | ❌ No |
| **Jobicy** | ✅ Funcional | 15 | 100% Remoto | ❌ No |
| **Colombia presencial** | ❌ Sin fuente | — | Presencial/Híbrido | N/A |

> **Nota Adzuna 429**: El error 429 (Too Many Requests) ocurre en desarrollo porque el servidor reinicia frecuentemente y reejecutamos búsquedas repetidas. En producción con caché activa no debería presentarse. El plan gratuito de Adzuna permite 250 req/día.

---

## 2. Problema Principal Pendiente: Empleos Locales Colombia

### Situación actual
El 100% de los resultados son **empleos remotos globales**. No existe ningún resultado presencial o híbrido en Colombia porque ninguna de las 3 fuentes activas tiene base de datos local colombiana.

### Por qué es difícil
Los portales locales colombianos (Computrabajo, Elempleo, Magneto) **no tienen API pública**. Sus datos solo son accesibles mediante:
- Acuerdo comercial (pago)
- Web scraping (viola sus términos de uso)

### Opciones viables para empleos Colombia

#### Opción A — LinkedIn Jobs API (recomendada a largo plazo)
- Requiere solicitud de acceso a LinkedIn Developer
- Cubre empleos presenciales + híbridos + remotos en Colombia
- Proceso de aprobación: 2–8 semanas
- URL: `developer.linkedin.com/product-catalog/jobs`

#### Opción B — Arbeitnow API (gratuita, sin key)
- Solo empleos remotos con visa sponsorship (Alemania principalmente)
- No resuelve Colombia pero amplía pool remoto
- `https://www.arbeitnow.com/api/job-board-api`

#### Opción C — RSS scraping de portales Colombia
Portales como **El Empleo** y **Computrabajo** exponen feeds RSS parciales. No es una API pero es scraping semi-estructurado. Requiere mantenimiento.

#### Opción D — Integración con Indeed Publisher (mediano plazo)
- Indeed tiene API Publisher para publishers verificados
- Proceso de aplicación: `ads.indeed.com/jobroll/xmlfeed`
- Cubre Colombia con buenos resultados

#### Opción E — Crawl.io / BrightData (pago)
- Servicios de extracción web legal para Computrabajo/Elempleo
- Costo mínimo: ~$50/mes

### **Recomendación para mañana**
Implementar **Arbeitnow** como fuente adicional gratuita (expande pool remoto) mientras se gestiona el proceso de LinkedIn o Indeed Publisher a largo plazo.

---

## 3. Issues Técnicos Conocidos

### 3.1 Jobicy — logos bloqueados (403 CORS)
- **Causa**: Jobicy tiene hotlink protection — bloquea carga de imágenes desde dominios externos
- **Estado**: ✅ **Corregido** — `employer_logo: null` para Jobicy, el avatar inicial se muestra como fallback
- **Commit**: Sesión 10/03/2026

### 3.2 Adzuna — 429 en desarrollo
- **Causa**: Rate limiting del plan gratuito (250 req/día). En dev el servidor reinicia constantemente y reconsume cuota
- **Impacto en producción**: Ninguno — la caché de 10 minutos evita hits repetidos
- **Solución a considerar**: Aumentar `CACHE_TTL_MS` a 30 minutos en prod

### 3.3 Matching score — "Fuerte en Communication"
- **Síntoma**: Algunas cards muestran solo "Communication" como fortaleza — no es informativo
- **Causa**: Las habilidades blandas tienen peso 0.4x pero aún aparecen en el feedback
- **Fix sugerido**: Excluir habilidades `tier: 'soft'` del bloque "Fuerte en X" en el feedback

### 3.4 Adzuna — calidad de resultados mixta
- **Síntoma**: Algunos resultados de Adzuna son poco relevantes para el perfil de dev
- **Causa**: Adzuna indexa empleos muy variados (HVAC, Vet Tech con "entry level remote")
- **Fix sugerido**: Agregar filtro de categoría en la petición a Adzuna (`category=it-jobs` para perfiles tech)

---

## 4. Arquitectura Actual del Pipeline

```
Usuario busca "tech"
        │
        ▼
jobController.js
        │
        ├─► fetchAdzuna('us', 20 jobs) ─► "tech entry level remote"
        ├─► fetchAdzuna('gb', 10 jobs) ─► "tech entry level remote"
        ├─► fetchRemotive(15 jobs)     ─► "tech"
        └─► fetchJobicy(15 jobs)       ─► tag: "tech"
                │
                ▼
         merge → isQualityJob (spam filter)
                │
                ▼
         strictExperienceFilter
         (yearsRegex + blockedTitles por nivel)
                │
                ▼ (si < 8 pasan → usa pool completo)
                │
                ▼
         isColombiaJob → _scope: colombia | internacional
         _scope: remoto (pre-asignado por fuente)
                │
                ▼
         enrichJobsWithMatchData (jobMatchService.js)
         → score (0-100) + band + strengths + gaps + resources
                │
                ▼
         sort by score DESC → top 10
                │
                ▼
         res.json({ jobs: top10 })
```

---

## 5. Fórmula de Matching (referencia rápida)

```
finalScore = clamp(18, maxCap,
  skillScore   × 0.60   ← skills ponderadas (title 3x, soft 0.4x)
  + titleAlign × 0.15   ← alineación de rol
  + expScore   × 0.15   ← brecha de experiencia
  + profStrng  × 0.10   ← completitud del perfil
)

maxCap = 48 si senior + 0-2 años experiencia
maxCap = 50 si brecha ≥ 4 años
maxCap = 98 si brecha ≤ 1 año
```

---

## 6. Roadmap Priorizado

### Prioridad Alta (mañana)
- [ ] Implementar filtro de categoría en Adzuna (`category=it-jobs`)
- [ ] Excluir soft skills del bloque "Fuerte en X"
- [ ] Agregar Arbeitnow como 4ta fuente gratuita (amplía pool remoto)
- [ ] Investigar RSS de Elempleo / Computrabajo

### Prioridad Media (esta semana)
- [ ] Solicitar acceso a Indeed Publisher API
- [ ] Aumentar CACHE_TTL a 30 min para prod (reduce hits Adzuna)
- [ ] Agregar paginación básica (mostrar más de 10 resultados)
- [ ] Mejorar el hint de nivel: agregar keywords de área además del nivel (`"junior developer"` en vez de solo `"junior"`)

### Prioridad Baja (futuro)
- [ ] Solicitud LinkedIn Jobs API
- [ ] Redis para caché persistente entre reinicios
- [ ] Dashboard de analytics de búsquedas (qué búsquedas hacen los usuarios)

---

## 7. Variables de Entorno Requeridas

```env
# .env — backend

# Adzuna (gratuita, 250 req/día)
# Registro: https://developer.adzuna.com
ADZUNA_APP_ID=xxxxxxxx
ADZUNA_APP_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Remotive — sin key
# Jobicy — sin key
# Arbeitnow — sin key (pendiente integrar)
```

---

*Informe generado el 10 de marzo de 2026 — Repositorio NEXT v1.0-beta.*
