import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import User from '../models/User.js';
import Message from '../models/Message.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
let ttsVoicesCache = { fetchedAt: 0, names: [] };

const getGoogleTtsKey = () => process.env.GOOGLE_TTS_KEY || process.env.GOOGLE_API_KEY;

const getAvailableGoogleTtsVoices = async () => {
    const now = Date.now();
    const cacheAgeMs = 10 * 60 * 1000; // 10 minutos
    if (ttsVoicesCache.names.length > 0 && now - ttsVoicesCache.fetchedAt < cacheAgeMs) {
        return ttsVoicesCache.names;
    }

    const listUrl = `https://texttospeech.googleapis.com/v1/voices?key=${getGoogleTtsKey()}&languageCode=es-ES`;
    const { data } = await axios.get(listUrl, { timeout: 15_000 });
    const names = (data?.voices || []).map((v) => v.name).filter(Boolean);
    ttsVoicesCache = { fetchedAt: now, names };
    return names;
};

const pickGoogleVoice = (availableVoiceNames = []) => {
    // Si el usuario define GOOGLE_TTS_VOICE, se respeta al 100%.
    // Lista de preferencia: solo voces MASCULINAS verificadas en la API actual.
    // NOTA: Neural2-B fue eliminado por Google. Usar Neural2-F o Neural2-G.
    const envPreferred = process.env.GOOGLE_TTS_VOICE;
    const preferred = envPreferred
        ? [envPreferred, 'es-ES-Neural2-F', 'es-ES-Neural2-G', 'es-ES-Chirp3-HD-Enceladus', 'es-ES-Chirp3-HD-Zubenelgenubi', 'es-ES-Studio-F']
        : ['es-ES-Neural2-F', 'es-ES-Neural2-G', 'es-ES-Chirp3-HD-Enceladus', 'es-ES-Chirp3-HD-Zubenelgenubi', 'es-ES-Studio-F'];

    const firstAvailablePreferred = preferred.find((name) => availableVoiceNames.includes(name));
    if (firstAvailablePreferred) {
        return {
            name: firstAvailablePreferred,
            languageCode: firstAvailablePreferred.startsWith('es-US-') ? 'es-US' : 'es-ES',
        };
    }

    // Fallback: cualquier voz Neural2 masculina disponible
    const maleSpanish = availableVoiceNames.find((name) =>
        name === 'es-ES-Neural2-F' || name === 'es-ES-Neural2-G' || name === 'es-ES-Studio-F'
    );
    if (maleSpanish) {
        return {
            name: maleSpanish,
            languageCode: 'es-ES',
        };
    }

    // Fallback defensivo final: usar la voz del .env o Neural2-F (masculina, verificada).
    const fallbackName = envPreferred || 'es-ES-Neural2-F';
    return { name: fallbackName, languageCode: fallbackName.startsWith('es-US-') ? 'es-US' : 'es-ES' };
};

const synthesizeGoogleTts = async (googleUrl, text, voice) => {
    try {
        const payload = {
            input: { text },
            voice,
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,  // velocidad natural
                pitch: 0.0,         // sin modificar el tono
            },
        };

        const { data } = await axios.post(googleUrl, payload, { timeout: 20_000 });
        const audioContent = data?.audioContent;
        if (!audioContent) {
            throw new Error('Google TTS respondió sin audioContent.');
        }
        return Buffer.from(audioContent, 'base64');
    } catch (error) {
        // Esto muestra exactamente qué está rechazando Google en producción.
        console.error('[Google TTS Error]', {
            status: error.response?.status,
            message: error.response?.data?.error?.message,
            code: error.response?.data?.error?.code,
        });
        throw error;
    }
};

// ── Catálogo de etiquetas legibles ──────────
const AREA_LABELS = {
    tech: 'Tecnología e Informática',
    business: 'Administración y Negocios',
    design: 'Diseño y Artes Creativas',
    marketing: 'Marketing y Comunicación',
    health: 'Ciencias de la Salud',
    law: 'Derecho y Ciencias Sociales',
    finance: 'Finanzas y Contabilidad',
    engineering: 'Ingeniería',
    science: 'Ciencias e Investigación',
    education: 'Educación y Pedagogía',
    other: 'Área general',
};

const JOB_TYPE_LABELS = {
    internship: 'Pasantía / Práctica profesional',
    first_job: 'Primer empleo formal',
    parttime: 'Trabajo part-time',
    freelance: 'Freelance / Proyectos',
    remote: 'Trabajo remoto',
};

const GOAL_LABELS = {
    cv: 'Mejorar su hoja de vida',
    skills: 'Identificar brechas de habilidades',
    network: 'Conectar con empresas',
    salary: 'Conocer su valor salarial',
    coach: 'Tener un mentor/coach',
    practice: 'Prepararse para entrevistas',
};

const EXPERIENCE_LEVEL_LABELS = {
    'Sin experiencia': 'Sin experiencia laboral previa',
    'Menos de 1 año': 'Menos de 1 año de experiencia',
    '1-3 años': '1 a 3 años de experiencia',
    '3-5 años': '3 a 5 años de experiencia',
    'Más de 5 años': 'Más de 5 años de experiencia',
};

// ── Función que obtiene el perfil desde MySQL y construye el prompt ──────────
// Añadimos isFirstMessage para controlar la máquina de estados
const buildDynamicSystemPrompt = async (userId, isInterviewMode, isFirstMessage = false) => {
    const todayDate = new Date().toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    try {
        const user = await User.findByPk(userId, {
            attributes: ['name', 'area', 'skills', 'goals', 'jobType', 'experienceLevel', 'cvText']
        });

        if (!user) throw new Error('Usuario no encontrado en la DB');

        const areaLabel = AREA_LABELS[user.area] || user.area || 'área no especificada';
        const jobTypeLabel = JOB_TYPE_LABELS[user.jobType] || user.jobType || 'oportunidad laboral';
        const experienceLevelLabel = EXPERIENCE_LEVEL_LABELS[user.experienceLevel] || user.experienceLevel || 'nivel de experiencia no especificado';
        const skills = Array.isArray(user.skills) && user.skills.length > 0
            ? user.skills.join(', ')
            : 'habilidades no especificadas';
        const goalsList = Array.isArray(user.goals) && user.goals.length > 0
            ? user.goals.map(g => GOAL_LABELS[g] || g).join(', ')
            : 'sin metas específicas aún';
        // Extraer texto legible del cvText (puede ser JSON estructurado o texto plano)
        let cvSnippet = '';
        if (user.cvText) {
            try {
                const parsed = JSON.parse(user.cvText);
                cvSnippet = parsed.rawText || JSON.stringify(parsed, null, 2);
            } catch {
                cvSnippet = user.cvText;
            }
            cvSnippet = cvSnippet.slice(0, 8000);
        }

        const cvBlock = cvSnippet
            ? `\n\n                    CV DEL CANDIDATO (texto extraído automáticamente):\n                    ---\n                    ${cvSnippet}\n                    ---\n                    Usa este CV para personalizar tus preguntas. Puedes hacer referencia a experiencias, empresas o proyectos mencionados en él.`
            : '';

        if (isInterviewMode) {
            // Regla dinámica de estado: Si es el primer mensaje, saluda. Si no, prohibido saludar.
            const stateRule = isFirstMessage
                ? 'REGLA DE ESTADO ACTUAL: Esta es tu PRIMERA intervención. Tu único objetivo en este turno es presentarte brevemente como reclutador, mencionar que leíste su perfil y pedirle directamente que hable de sobre el, su perfil profesional y trayectoria.'
                : 'REGLA DE ESTADO ACTUAL: La entrevista ya inició. TIENES ESTRICTAMENTE PROHIBIDO saludar, decir "Bienvenido" o presentarte de nuevo. Ve directo a evaluar la respuesta del candidato y lanzar la siguiente pregunta de la fase correspondiente.';

            return `FECHA ACTUAL (dato externo verificado, prevalece sobre tu entrenamiento): ${todayDate}. El año real es ${new Date().getFullYear()}. Si el usuario menciona que algo ocurrió en ${new Date().getFullYear()} o en fechas recientes, es completamente válido y no debes cuestionarlo.

                    Eres un Reclutador de Recursos Humanos de una empresa (inventa un nombre creíble según el área) con 12 años de experiencia.
                    Conduces el PRIMER FILTRO de entrevista (Fit Cultural y Habilidades Blandas) para ${user.name}. NO eres un perfil técnico.
                    Tu estilo es profesional, directo y exigente. No eres un coach ni un motivador: eres quien decide si el candidato pasa al siguiente filtro o no.

                    PERFIL DEL CANDIDATO:
                    - Área: ${areaLabel}
                    - Habilidades: ${skills}
                    - Nivel de experiencia: ${experienceLevelLabel}${cvBlock}

                    IMPORTANTE: Ten en cuenta que el usuario tiene ${experienceLevelLabel}. Ajusta la dificultad de tus preguntas de entrevista y tus expectativas a este nivel exacto. Si es alguien sin experiencia o con poca experiencia, sé más pedagógico y enfócate en potencial; si tiene más experiencia, sé más exigente y espera respuestas más elaboradas.

                    ${stateRule}

                    FLUJO LINEAL (avanza solo cuando el candidato responda):
                    - Fase 1: Trayectoria y presentación personal.
                    - Fase 2: Motivación (¿Por qué nosotros? ¿Por qué deberíamos contratarte?).
                    - Fase 3: Introspección (fortalezas y debilidades reales, sin clichés).
                    - Fase 4: Situaciones críticas (Metodología STAR: logro o conflicto resuelto).
                    - Fase 5: Cierre y expectativas salariales.

                    MANEJO DE RESPUESTAS INAPROPIADAS O POCO PROFESIONALES:
                    Si el candidato responde con lenguaje soez, actitud defensiva, informalidad excesiva o respuestas que no se sostendrían en una entrevista real:
                    - NUNCA lo valides. Prohibido decir "aprecio tu franqueza", "entiendo que es difícil" o frases similares.
                    - Corrígelo con firmeza y brevedad. Ejemplo: "Esa respuesta no es adecuada para este contexto. Le pido que lo reformule de forma profesional."
                    - Registra esa actitud: impactará negativamente en el reporte final.

                    PROTOCOLO DE LONGITUD — aplícalo ANTES de escribir cada respuesta:
                    Pregúntate: "¿Puedo decir esto en menos palabras sin perder el punto?". La respuesta correcta es siempre la más corta que funcione. Una reacción + una pregunta = máximo 2 oraciones en total.

                    INSTRUCCIONES ABSOLUTAS:
                    1. UNA SOLA PREGUNTA por turno, sin excepciones.
                    2. NO eres técnico/a: las habilidades (${skills}) son contexto, nunca las evalúes en profundidad.
                    3. BREVEDAD ESTRICTA: reacción breve a la respuesta anterior + tu única pregunta. Sin introducciones ni relleno.
                    4. REPORTE FINAL: si el usuario pide finalizar, genera un informe en Markdown que comience con la palabra REPORTE, con puntuación del 1 al 10 en: Fit Cultural, Comunicación, Autoconocimiento, Potencial. Incluye una sección "Observaciones" donde señales explícitamente cualquier comportamiento no profesional detectado. El reporte SÍ puede ser extenso y detallado.
                    5. IDENTIDAD: Nunca digas tu nombre propio. Identifícate únicamente como "soy el/la reclutador/a de [nombre empresa]". Si alguien te pregunta tu nombre, responde que prefieres mantener el proceso formal y anónimo.`;
        }

        return `FECHA ACTUAL (dato externo verificado, prevalece sobre tu entrenamiento): ${todayDate}. El año real es ${new Date().getFullYear()}. Si el usuario menciona que algo ocurrió en ${new Date().getFullYear()} o en fechas recientes, es completamente válido y no debes cuestionarlo.

                Eres el IA Coach de NEXT, una plataforma de empleabilidad. Hoy es ${todayDate}.
                Hablas con ${user.name} (Área: ${areaLabel}, Skills: ${skills}, Metas: ${goalsList}, Tipo de trabajo buscado: ${jobTypeLabel}, Nivel de experiencia: ${experienceLevelLabel}).
                ${cvSnippet ? `\n                CONTEXTO DEL CV DEL USUARIO:\n                ---\n                ${cvSnippet}\n                ---\n                Usa este CV para personalizar tus consejos, identificar brechas de habilidades y hacer referencias concretas a su experiencia real.` : ''}

                IMPORTANTE: Ten en cuenta que el usuario tiene ${experienceLevelLabel}. Ajusta la dificultad de tus consejos laborales, explicaciones técnicas y recomendaciones a este nivel exacto. Si es alguien sin experiencia, sé más pedagógico y básico; si tiene más experiencia, asume conocimientos previos y profundiza más.

                PERSONALIDAD: Profesional, empático y directo. Adapta tus respuestas al mercado laboral latinoamericano.

                ── PROTOCOLO DE LONGITUD (ejecútalo mentalmente ANTES de escribir) ──
                1. Clasifica la pregunta en uno de los 3 modos.
                2. Aplica solo lo que ese modo requiere.
                3. Elimina todo lo que no aporte valor real. Si una frase puede suprimirse sin perder el punto, suprímela.

                MODO A — Aprendizaje / "enséñame X" / "¿cómo funciona Y?":
                  - 1 o 2 conceptos por turno + un ejemplo ultra corto. Nada más.
                  - Método socrático: guía paso a paso, no vuelques todo el tema de una vez.
                  - Cierra con UNO de estos mecanismos (alterna para no ser predecible):
                      * RETO PRÁCTICO: mini-ejercicio que el usuario pueda resolver solo.
                      * PREGUNTA TRAMPA: afirmación sutilmente incorrecta para que el usuario corrija.
                      * PREGUNTA DE COMPRENSIÓN: pregunta directa sobre lo recién explicado.
                      * PREGUNTA AVANZADA: despierta curiosidad con un nivel más de profundidad.

                MODO B — Consejo puntual / pregunta de sí o no / dato concreto:
                  - Ve directo a la respuesta. 2-4 líneas + lista de máximo 4 puntos si realmente aportan.
                  - Una pregunta de seguimiento solo si abre valor adicional claro.

                MODO C — Análisis profundo / estrategia / plan de carrera / comparativas:
                  - Responde con la profundidad que la pregunta merece, sin cortes artificiales.
                  - Usa bullets o secciones cortas para escaneabilidad. Sin párrafos densos.
                  - Cierra con UNA acción o pregunta concreta.

                REGLAS UNIVERSALES (aplican a los 3 modos sin excepción):
                - Prohibido: saludos de relleno ("¡Claro!", "¡Excelente pregunta!", "¡Por supuesto!"), repetir lo que el usuario ya dijo, conclusiones vacías.
                - NUNCA dejes una idea a medias. Si no cabe completa, no la incluyas.
                - La brevedad es respeto al tiempo del usuario. Menos palabras con más valor siempre gana.`;

    } catch (error) {
        console.error('[coachController] Error al obtener perfil:', error.message);
        return `Eres el IA Coach de NEXT. Sé directo, motivador y profesional.`;
    }
};

// ── Helper para construir el modelo de Gemini usando systemInstruction nativo ──
// isInterview → respuestas cortas (entrevista hablada); de lo contrario sin límite práctico.
const buildModel = (isReport, isInterview, systemPrompt) => {
    const modelName = isReport ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

    // Límites de tokens por modo:
    //  - Reporte final  → 8192 (pro, análisis completo)
    //  - Entrevista oral → 2048 (flash, evita truncar respuestas de voz)
    //  - Coach normal    → 8192 (flash, sin cortar ideas)
    // NOTA: gemini-2.5-flash tiene razonamiento interno que consume tokens;
    // por eso 600 truncaba las respuestas. 2048 garantiza completitud sin excesos.
    const maxOutputTokens = isReport ? 8192 : isInterview ? 2048 : 8192;

    const generationConfig = {
        maxOutputTokens,
        temperature: isReport ? 0.35 : 0.65,
        topP: 0.95,
        topK: 40,
        // Deshabilitar razonamiento interno en entrevista: respuestas más rápidas
        // y directas; todos los tokens van al output, no al pensamiento previo.
        ...(isInterview && !isReport ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    };
    const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ];
    console.log(`[Gemini] 🧠 Iniciando chat con modelo: ${modelName} | Modo: ${isReport ? 'REPORTE' : isInterview ? 'ENTREVISTA' : 'COACH'}`);

    // Inyección nativa del system prompt
    return genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig,
        safetySettings
    }, { apiVersion: 'v1beta' }); // Aseguramos v1beta para soporte completo de systemInstruction
};

const buildCvGenerationPrompt = async (userId, isFirstMessage = false, templateId = 'francisco') => {
    try {
        const user = await User.findByPk(userId, {
            attributes: ['name', 'area'],
        });

        if (!user) throw new Error('Usuario no encontrado');

        const areaLabel = AREA_LABELS[user.area] || user.area || 'área no especificada';

        const contactDataBlock = `   - Nombre completo\n   - Correo electrónico\n   - Tipo de documento (CC, TI, Pasaporte, etc.) y Número de documento\n   - Dirección / Ubicación\n   - Teléfono/Celular\n   - LinkedIn (URL o usuario)\n   - GitHub (URL o usuario, opcional; si no aplica puede responder NO)\n   - Portafolio web (URL)`;

        const jsonContactExtra = `    "documentType": "...",\n    "documentNumber": "...",\n    "address": "...",\n    "github": "...",\n    "portfolio": "...",`;

        const stateRule = isFirstMessage
            ? `ESTADO ACTUAL — PRIMER TURNO: Saluda brevemente en una sola frase y pregunta si desea activar el Modo de Creación Asistida. No hagas ninguna otra pregunta todavía.`
            : `ESTADO ACTUAL — CONVERSACIÓN EN CURSO: NO vuelvas a saludar ni repetir bienvenidas.
Revisa el historial completo de la conversación y determina en cuál paso estás AHORA.

SECUENCIA OBLIGATORIA (nunca te saltes un paso, siempre sigue este orden):
  PASO 0   → ¿Modo Asistido activado? (sí / no)
  PASO 0.5 → ¿Incluir foto de perfil? (sí / no)
  PASO 1   → Datos básicos de contacto
  PASO 2   → Perfil Profesional / Resumen
  PASO 3   → Educación
  PASO 4   → Experiencia Laboral
  PASO 5   → Habilidades (técnicas y blandas)
  PASO 6   → Idiomas
    PASO 7a  → Referencias personales
  PASO 7b  → Referencias familiares
  FIN      → Generar JSON final

⚠️  TRANSICIÓN OBLIGATORIA:
Si en el historial el usuario acaba de responder el PASO 0 (modo asistido) y todavía NO ha respondido el PASO 0.5, tu ÚNICO siguiente mensaje es preguntar si quiere incluir la foto.
Responder "no" al modo asistido significa solo que no se mejorarán los textos — el flujo de recolección continúa normalmente desde el PASO 0.5 en adelante.
ESTÁ TERMINANTEMENTE PROHIBIDO saltar al perfil profesional, al resumen o a cualquier otro tema sin haber preguntado primero por la foto.`;

        return `Eres el asistente experto en creación de CVs profesionales de la plataforma NEXT.
Hablas con ${user.name} (Área: ${areaLabel}).

OBJETIVO: Recolectar la información del CV para la plantilla "${templateId || 'francisco'}". Haz UNA SOLA pregunta por turno.

PLANTILLA ACTIVA: ${templateId || 'francisco'} — incluye este valor exacto en el campo "templateId" del JSON final.

━━━ PASO 0 — MODO ASISTIDO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pregunta: "¿Te gustaría activar el Modo de Creación Asistida?"
- sí → assistedMode = true  (mejorarás textos y pedirás aprobación antes de avanzar)
- no → assistedMode = false (recolectas la información tal como el usuario la da, sin modificar)
⚠️  Sea cual sea la respuesta, el SIGUIENTE paso es SIEMPRE el PASO 0.5. Sin excepciones.

━━━ PASO 0.5 — FOTO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pregunta: "¿Te gustaría incluir tu foto de perfil en el documento?"
- sí → includePhoto = true
- no → includePhoto = false

━━━ PASOS 1–7 — RECOLECCIÓN (en este orden exacto) ━━━━━━━━━━━━━━━━━━━━━━━━━
1. DATOS BÁSICOS:
${contactDataBlock}

2. PERFIL PROFESIONAL: pide un resumen de 2-3 oraciones de quién es y qué lo diferencia.

3. EDUCACIÓN: institución, título/carrera y fechas. Si tiene más de una, pídelas de a una.

4. EXPERIENCIA LABORAL: empresa, cargo, fechas y 1-2 logros/responsabilidades clave.
   - Tras CADA experiencia pregunta: "¿Deseas que aparezca como proyecto?"
     sí → projectLabel = true | no → projectLabel = false
   - Sin experiencia: permite proyectos personales con projectLabel = true.

5. HABILIDADES:
   - Técnicas (pide lista separada por comas)
   - Blandas  (pide lista separada por comas)

6. IDIOMAS: nombre e nivel de cada idioma (ej. "Inglés — Avanzado B2").
   Después de cada uno pregunta si desea agregar otro.

7a. REFERENCIAS PERSONALES: nombre, cargo/ocupación y número de teléfono.
    - Pregunta si desea agregar más de una.
7b. REFERENCIAS FAMILIARES: nombre, cargo/ocupación y número de teléfono.
    - Pregunta si desea agregar más de una.

━━━ MODO ASISTIDO (solo si assistedMode = true) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para Perfil Profesional, Experiencia y Habilidades:
1. Recibe la respuesta del usuario.
2. Ofrece versión mejorada: "Aquí tienes una versión mejorada: [texto]. ¿Está bien o cambias algo?"
3. Avanza SOLO cuando el usuario apruebe explícitamente.

━━━ REGLAS GENERALES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- UNA sola pregunta por turno. Sin excepciones.
- Si el usuario no tiene algún dato, acéptalo y avanza.
- Si una respuesta es ambigua, pide una sola aclaración.
- Al preguntar por GitHub usa esta frase exacta o una equivalente muy cercana: "¿Te gustaría añadir un perfil de GitHub? Es una web muy famosa entre desarrolladores; si no eres uno, solo responde NO.".
- Sé conversacional y breve.

━━━ SINCRONIZACIÓN DE VISTA PREVIA EN TIEMPO REAL ━━━━━━━━━━━━━━━━━━━━━━━━━━
Desde el PASO 0.5 en adelante, al FINAL de cada respuesta donde el usuario aporte datos,
incluye el siguiente bloque oculto con TODOS los datos recolectados hasta ese momento:

[CV_PARTIAL]{"personalInfo":{...},"includePhoto":bool,"summary":"...","education":[...],"experience":[...],"skills":{"technical":[...],"soft":[...]},"languages":[...],"personalReferences":[...],"familyReferences":[...]}[/CV_PARTIAL]

Reglas del bloque [CV_PARTIAL]:
- Incluye TODOS los campos recolectados. Para datos aún vacíos usa null, [] o "".
- Usa los mismos nombres de campo que en [CV_FINAL_DATA].
- NUNCA incluyas [CV_PARTIAL] en el mismo mensaje que [CV_FINAL_DATA].
- El usuario NO verá este bloque; es solo para actualizar la vista previa en pantalla.

━━━ FINALIZACIÓN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cuando hayas completado todos los pasos (0 al 7), genera el JSON final entre los tags.
No agregues ningún texto después del tag de cierre.

[CV_FINAL_DATA]
{
  "templateId": "${templateId || 'francisco'}",
  "personalInfo": {
    "name": "...",
    "phone": "...",
    "email": "",
    "linkedin": "...",
${jsonContactExtra}  },
  "includePhoto": true,
  "summary": "...",
  "education": [
    { "institution": "...", "degree": "...", "dates": "...", "description": "" }
  ],
  "experience": [
    { "company": "...", "position": "...", "dates": "...", "description": "...", "projectLabel": false }
  ],
  "skills": {
    "technical": ["..."],
    "soft": ["..."]
  },
  "languages": [
    { "language": "...", "level": "..." }
  ],
    "personalReferences": [
        { "name": "...", "position": "...", "phone": "..." }
    ],
    "familyReferences": [
        { "name": "...", "position": "...", "phone": "..." }
    ],
  "hasExperience": true
}
[/CV_FINAL_DATA]

REGLAS DEL JSON:
- "templateId" SIEMPRE debe ser "${templateId || 'francisco'}" — no lo cambies ni omitas.
- Experiencias marcadas como proyecto → "projectLabel": true en "experience".
- "skills.technical" y "skills.soft" deben ser arrays, nunca texto plano.
- "languages" debe ser un array de objetos con "language" y "level". Si no hay idiomas usa [].
- "personalReferences" y "familyReferences" deben ser arrays. Si no hay referencias usa [].
- Si el usuario responde NO a GitHub, guarda "github" como "" o "NO".

${stateRule}`;
    } catch (error) {
        console.error('[buildCvGenerationPrompt] Error:', error.message);
        return `Eres el asistente de creación de CVs de NEXT. Sigue en orden: (0) modo asistido, (0.5) foto, (1) datos básicos, (2) perfil profesional, (3) educación, (4) experiencia, (5) habilidades, (6) idiomas, (7a) referencias personales, (7b) referencias familiares. Genera el JSON con templateId="${templateId}", languages array, personalReferences, familyReferences y projectLabel en experience, entre tags [CV_FINAL_DATA]...[/CV_FINAL_DATA].`;
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/coach/history  → Devuelve los últimos 50 mensajes del usuario
// ══════════════════════════════════════════════════════════════════════════════
export const getChatHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const messages = await Message.findAll({
            where: { userId },
            order: [['createdAt', 'ASC']],
            limit: 50,
            attributes: ['id', 'sender', 'text', 'createdAt'],
        });

        // ── AUTO-CLEANUP RETROACTIVO DE CONTAMINACIÓN DE CV MAKER ──
        // Si detectamos texto de plantillas CV en la BD (guardados antes del fix),
        // borramos la conversación para que el coach normal vuelva a su rol estándar
        // y no se quede pegado repitiendo formato JSON.
        const isPolluted = messages.some(m => m.text.includes('[CV_PARTIAL]') || m.text.includes('[CV_FINAL_DATA]'));
        if (isPolluted) {
            console.warn(`[getChatHistory] Detectada contaminación de CV Maker para userId ${userId}. Purgando historial de BD.`);
            await Message.destroy({ where: { userId } });
            return res.json({ history: [] });
        }

        // Normalizar al formato que ya usa el frontend: { id, sender, text }
        const normalized = messages.map((m) => ({
            id: m.id.toString(),
            sender: m.sender,   // 'user' | 'ai'
            text: m.text,
        }));

        return res.json({ history: normalized });
    } catch (error) {
        console.error('[getChatHistory] Error:', error.message);
        return res.status(500).json({ error: 'No se pudo cargar el historial.' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/coach/history  → Elimina todos los mensajes del usuario
// ══════════════════════════════════════════════════════════════════════════════
export const clearChatHistory = async (req, res) => {
    try {
        const userId = req.user.userId;
        await Message.destroy({ where: { userId } });
        return res.json({ ok: true });
    } catch (error) {
        console.error('[clearChatHistory] Error:', error.message);
        return res.status(500).json({ error: 'No se pudo borrar el historial.' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/coach/init
// ══════════════════════════════════════════════════════════════════════════════
export const initCoach = async (req, res) => {
    try {
        const userId = req.user.userId;
        const isInterviewMode = req.query.mode === 'interview';
        const isCvMode = req.query.mode === 'createcv';
        const templateId = req.query.templateId || 'francisco';

        // isFirstMessage = true
        let systemPrompt;
        if (isCvMode) {
            systemPrompt = await buildCvGenerationPrompt(userId, true, templateId);
        } else {
            systemPrompt = await buildDynamicSystemPrompt(userId, isInterviewMode, true);
        }

        const model = buildModel(false, isCvMode ? false : isInterviewMode, systemPrompt);

        const chat = model.startChat({ history: [] });

        // Un prompt invisible solo para "empujar" a la IA a que hable primero
        const openingPrompt = 'Inicia la conversación siguiendo estrictamente tu regla de estado actual.';
        const result = await chat.sendMessage(openingPrompt);
        const reply = result.response.text();

        return res.json({ reply });

    } catch (error) {
        console.error('[initCoach] Error:', error.message);
        return res.status(500).json({
            reply: '¡Hola! Soy tu IA Coach de NEXT. Estoy lista para comenzar la entrevista.'
        });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/coach/chat
// ══════════════════════════════════════════════════════════════════════════════
export const chatWithCoach = async (req, res) => {
    try {
        const { message, history, isInterviewMode, finishSimulation, isCvMode, templateId } = req.body;
        const userId = req.user.userId;

        if (!message && !finishSimulation) {
            return res.status(400).json({ error: 'El campo message es requerido.' });
        }

        const isReportRequest = !isCvMode && (finishSimulation ||
            message?.toLowerCase().includes('reporte') ||
            message?.toLowerCase().includes('finalizar simulación'));

        // isFirstMessage = false (ya estamos en el loop del chat)
        let systemPrompt;
        if (isCvMode) {
            systemPrompt = await buildCvGenerationPrompt(userId, false, templateId || 'francisco');
        } else {
            systemPrompt = await buildDynamicSystemPrompt(userId, isInterviewMode || false, false);
        }

        const model = buildModel(isReportRequest, isCvMode ? false : (isInterviewMode || false), systemPrompt);

        // Limpieza de historial: solo roles 'user' y 'model' válidos
        let cleanedHistory = (history || [])
            .map(msg => ({
                role: msg.sender === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }));

        // Validar que el historial empiece por 'user' si vamos a mandar un nuevo mensaje
        // (Gemini exige alternancia estricta user -> model -> user)
        if (cleanedHistory.length > 0 && cleanedHistory[0].role === 'model') {
            // Inyectamos un "trigger" inicial falso para balancear la conversación
            cleanedHistory.unshift({ role: 'user', parts: [{ text: 'Inicia la entrevista.' }] });
        }

        const chat = model.startChat({ history: cleanedHistory });

        const prompt = finishSimulation
            ? 'Genera ahora el REPORTE FINAL de mi entrevista basado en nuestra conversación.'
            : message;

        // ── Guardar mensaje del usuario en la BD ─────────────────────────────
        // SOLO coach normal y el reporte final de entrevista. El modo CV usa
        // localStorage en el frontend — NO se persiste en la BD para no mezclar
        // historial del coach con el de creación de CV.
        if (!isCvMode && (!isInterviewMode || finishSimulation) && message) {
            await Message.create({ userId, sender: 'user', text: message });
        }

        // ── Llamada a Gemini con retry automático ante 503 (sobrecarga) ───────
        let result;
        const MAX_RETRIES = 3;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                result = await chat.sendMessage(prompt);
                break; // Éxito — salir del loop
            } catch (err) {
                const status = err.status || err.response?.status;
                const isRetryable = status === 503 || status === 429 || status === 500;
                if (isRetryable && attempt < MAX_RETRIES) {
                    const wait = attempt * 2000; // 2s, 4s — backoff progresivo
                    console.warn(`[chatWithCoach] Gemini ${status} en intento ${attempt}. Reintentando en ${wait}ms...`);
                    await new Promise(r => setTimeout(r, wait));
                } else {
                    throw err; // No reintentable o se agotaron los intentos
                }
            }
        }
        const replyText = result.response.text();

        if (!replyText) {
            return res.status(200).json({ reply: 'Lo siento, no pude procesar tu respuesta. ¿Podrías repetirlo?' });
        }

        // ── Guardar respuesta de la IA en la BD ──────────────────────────────
        // Mismo criterio: solo coach normal y reporte final. CV usa localStorage.
        if (!isCvMode && (!isInterviewMode || finishSimulation)) {
            await Message.create({ userId, sender: 'ai', text: replyText });
        }

        return res.json({ reply: replyText });

    } catch (error) {
        console.error('[chatWithCoach] ERROR:', error.status || error.message);
        return res.status(500).json({ error: 'Servicio temporalmente fuera de línea.' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/coach/tts  → Dual TTS: Google Neural2 (default) | ElevenLabs (premium)
//   Body: { text: string, provider?: 'google' | 'elevenlabs' }
// ══════════════════════════════════════════════════════════════════════════════
export const ttsCoach = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'El campo text es requerido.' });

        const googleTtsKey = getGoogleTtsKey();
        if (!googleTtsKey) {
            return res.status(500).json({
                error: 'TTS no configurado en servidor.',
                details: 'Falta GOOGLE_TTS_KEY o GOOGLE_API_KEY en el backend.',
            });
        }

        const googleUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleTtsKey}`;
        let availableVoiceNames = [];
        try {
            availableVoiceNames = await getAvailableGoogleTtsVoices();
        } catch (listErr) {
            console.warn('[TTS] No se pudo listar voces de Google, se usará fallback local:', listErr.response?.data || listErr.message);
        }

        const selectedVoice = pickGoogleVoice(availableVoiceNames);
        console.log(`[TTS] 🎙️ Voz seleccionada: ${selectedVoice.name}`);

        let buffer;
        try {
            buffer = await synthesizeGoogleTts(googleUrl, text, selectedVoice);
        } catch (namedVoiceErr) {
            const message = namedVoiceErr.response?.data?.error?.message || namedVoiceErr.message || '';
            const isInvalidVoice = /voice|invalid|supported|not found/i.test(message);
            if (!isInvalidVoice) throw namedVoiceErr;

            console.warn(`[TTS] Voz con name falló (${selectedVoice.name}). Reintentando con voces masculinas...`);
            const genericVoiceFallbacks = [
                { name: 'es-ES-Neural2-F', languageCode: 'es-ES' },  // Masculina ✅
                { name: 'es-ES-Neural2-G', languageCode: 'es-ES' },  // Masculina ✅
                { name: 'es-ES-Chirp3-HD-Enceladus', languageCode: 'es-ES' }, // Masculina ✅
                { languageCode: 'es-ES', ssmlGender: 'MALE' },        // Genérico masculino último recurso
            ];

            let lastErr = namedVoiceErr;
            for (const genericVoice of genericVoiceFallbacks) {
                try {
                    console.log(`[TTS] 🔁 Reintento genérico: ${JSON.stringify(genericVoice)}`);
                    buffer = await synthesizeGoogleTts(googleUrl, text, genericVoice);
                    break;
                } catch (retryErr) {
                    lastErr = retryErr;
                }
            }

            if (!buffer) throw lastErr;
        }

        res.set('Content-Type', 'audio/mpeg');
        res.set('Content-Length', buffer.length);
        return res.send(buffer);

    } catch (error) {
        const details = error.response?.data?.error?.message || error.response?.data || error.message;
        console.error('[ttsCoach] Error:', details);
        return res.status(502).json({ error: 'Error al generar la voz.', details });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/coach/stt  → Transcribe audio con Google Cloud Speech-to-Text
// ══════════════════════════════════════════════════════════════════════════════
export const sttCoach = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió archivo de audio.' });

        // Google STT síncrono tiene un límite estricto de 60s de audio.
        // Un WebM/Opus de ~55s pesa aprox. 1.1 MB. Rechazamos sobre 1.5 MB
        // para evitar el error 400 "Sync input too long".
        const MAX_BYTES = 1.5 * 1024 * 1024; // 1.5 MB
        if (req.file.buffer.length > MAX_BYTES) {
            return res.status(413).json({
                error: 'El audio es demasiado largo. Por favor, habla en fragmentos más cortos (menos de 55 segundos).'
            });
        }

        const audioBase64 = req.file.buffer.toString('base64');

        const url = `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_API_KEY}`;
        const payload = {
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'es-CO',          // Español Colombia — mejor para el acento local
                alternativeLanguageCodes: ['es-ES', 'es-US'], // Fallbacks
                enableAutomaticPunctuation: true,
                model: 'latest_long',            // Modelo más preciso disponible
            },
            audio: { content: audioBase64 },
        };

        const { data } = await axios.post(url, payload);
        const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || '';

        return res.json({ text: transcript });

    } catch (error) {
        console.error('[sttCoach] Error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Error al transcribir el audio.' });
    }
};