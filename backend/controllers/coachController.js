import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import User from '../models/User.js';
import Message from '../models/Message.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// ── Áreas con perfil tecnológico (piden GitHub / Portafolio) ───────────────
const TECH_AREAS = new Set(['tech', 'engineering', 'science', 'design']);

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
        const cvBlock = user.cvText
            ? `\n\n                    CV DEL CANDIDATO (texto extraído automáticamente):\n                    ---\n                    ${user.cvText.slice(0, 8000)}\n                    ---\n                    Usa este CV para personalizar tus preguntas. Puedes hacer referencia a experiencias, empresas o proyectos mencionados en él.`
            : '';

        if (isInterviewMode) {
            // Regla dinámica de estado: Si es el primer mensaje, saluda. Si no, prohibido saludar.
            const stateRule = isFirstMessage
                ? 'REGLA DE ESTADO ACTUAL: Esta es tu PRIMERA intervención. Tu único objetivo en este turno es presentarte brevemente como reclutador, mencionar que leíste su perfil y pedirle directamente que hable de sobre el, su perfil profesional y trayectoria.'
                : 'REGLA DE ESTADO ACTUAL: La entrevista ya inició. TIENES ESTRICTAMENTE PROHIBIDO saludar, decir "Bienvenido" o presentarte de nuevo. Ve directo a evaluar la respuesta del candidato y lanzar la siguiente pregunta de la fase correspondiente.';

            return `Eres un Reclutador de Recursos Humanos de una empresa (inventa un nombre creíble según el área) con 12 años de experiencia.
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

        return `Eres el IA Coach de NEXT, una plataforma de empleabilidad. Hoy es ${todayDate}.
                Hablas con ${user.name} (Área: ${areaLabel}, Skills: ${skills}, Metas: ${goalsList}, Tipo de trabajo buscado: ${jobTypeLabel}, Nivel de experiencia: ${experienceLevelLabel}).
                ${cvBlock ? `\n                CONTEXTO DEL CV DEL USUARIO:\n                ---\n                ${user.cvText.slice(0, 8000)}\n                ---\n                Usa este CV para personalizar tus consejos, identificar brechas de habilidades y hacer referencias concretas a su experiencia real.` : ''}

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
    console.log(`[Gemini] Modelo seleccionado: ${modelName}`);

    // Inyección nativa del system prompt
    return genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig,
        safetySettings
    }, { apiVersion: 'v1beta' }); // Aseguramos v1beta para soporte completo de systemInstruction
};

const buildCvGenerationPrompt = async (userId, isFirstMessage = false) => {
    try {
        const user = await User.findByPk(userId, {
            attributes: ['name', 'area'],
        });

        if (!user) throw new Error('Usuario no encontrado');

        const isTechArea = TECH_AREAS.has(user.area);
        const areaLabel = AREA_LABELS[user.area] || user.area || 'área no especificada';

        const contactDataBlock = isTechArea
            ? `   - Nombre completo\n   - Teléfono/Celular\n   - LinkedIn (URL o usuario)\n   - GitHub (URL o usuario)\n   - Portafolio web (URL, si tiene)`
            : `   - Nombre completo\n   - Teléfono/Celular\n   - LinkedIn (URL o usuario)`;

        const jsonContactExtra = isTechArea
            ? `    "github": "...",\n    "portfolio": "...",`
            : '';

        const stateRule = isFirstMessage
            ? 'ESTADO ACTUAL — PRIMER TURNO: Saluda en una sola frase y pregunta exactamente si desea activar el Modo de Creación Asistida. No preguntes nada más todavía.'
            : 'ESTADO ACTUAL — CONVERSACIÓN EN CURSO: NO vuelvas a saludar. Continúa según el paso pendiente y respetando el flujo de aprobación del modo asistido si fue activado.';

        return `Eres el asistente experto en creación de CVs profesionales de la plataforma NEXT.\nHablas con ${user.name} (Área: ${areaLabel}).\n\nOBJETIVO: Recolectar la información necesaria para un CV Harvard, con preguntas breves y una a la vez.\n\nREGLA FUNDAMENTAL: Haz UNA SOLA pregunta o solicitud por turno. Nunca mezcles pasos.\n\nMÁQUINA DE ESTADOS OBLIGATORIA:\n- Paso 0: preguntar por Modo de Creación Asistida.\n- Paso 0.5: SOLO después de que el usuario responda al paso 0, pregunta por la foto.\n- Paso 1: SOLO después de que el usuario responda al paso 0.5, pregunta por los datos de contacto.\n- Está PROHIBIDO saltarte un paso o asumir una respuesta de un paso no preguntado todavía.\n- Está PROHIBIDO responder como si el usuario ya hubiera dicho que sí a la foto si aún no respondió esa pregunta.\n- Después de que el usuario diga si quiere modo asistido, tu siguiente turno debe ser únicamente la pregunta de la foto.\n\nPASO 0 — MODO ASISTIDO:\nPregunta exactamente esta idea: \"¿Te gustaría activar el Modo de Creación Asistida?\"\n- Si responde sí: assistedMode = true.\n- Si responde no: assistedMode = false.\n\nPASO 0.5 — FOTO:\nPregunta exactamente esta idea: \"¿Te gustaría incluir tu foto de perfil actual en el documento?\"\n- Si responde sí: includePhoto = true.\n- Si responde no: includePhoto = false.\n- Si el usuario aún no respondió esta pregunta, NO digas frases como \"incluiremos tu foto\" ni tomes la decisión por él.\n\nORDEN DE RECOLECCIÓN:\n1. **Datos de contacto**:\n${contactDataBlock}\n2. **Resumen / Perfil Profesional**: 2-3 oraciones sobre quién es profesionalmente y qué lo diferencia.\n3. **Educación**: Institución, título/carrera y fechas. Si tiene más de una, una a la vez.\n4. **Experiencia Laboral**: Para cada experiencia pregunta: empresa, cargo, fechas y 1-2 logros o responsabilidades clave.\n   - Después de terminar CADA experiencia, haz una pregunta breve adicional: \"¿Deseas que esta experiencia aparezca como proyecto?\"\n   - Si responde sí, guarda esa experiencia con el indicador projectLabel = true.\n   - Si responde no, guarda projectLabel = false.\n   - Si no tiene experiencia laboral, permite registrar proyectos dentro de esta misma sección como entradas marcadas con projectLabel = true.\n5. **Habilidades**:\n   - Técnicas\n   - Blandas\n\nLÓGICA DEL MODO ASISTIDO:\n- Aplica SOLO si assistedMode = true.\n- Para Resumen, Experiencia Laboral y Habilidades, primero mejora el texto y pide aprobación antes de avanzar.\n- Usa: \"Aquí tienes una versión mejorada de lo que me dijiste: [Texto Potenciado]. ¿Te parece bien o quieres cambiarle algo?\"\n- Solo avanza cuando el usuario apruebe explícitamente.\n\nMANEJO DE RESPUESTAS:\n- Si el usuario no tiene algún dato, acéptalo y continúa.\n- Sé conversacional y breve.\n- Si una respuesta es ambigua, pide una sola aclaración.\n\nEJEMPLO DE FLUJO CORRECTO:\n- Asistente: \"¿Te gustaría activar el Modo de Creación Asistida?\"\n- Usuario: \"Sí\"\n- Asistente: \"¿Te gustaría incluir tu foto de perfil actual en el documento?\"\n- Usuario: \"No\"\n- Asistente: \"Perfecto. ¿Cuál es tu nombre completo?\"\n\nFINALIZACIÓN:\nCuando tengas todo, genera el JSON final exactamente así, entre los tags y sin texto después del cierre:\n\n[CV_FINAL_DATA]\n{\n  "personalInfo": {\n    "name": "...",\n    "phone": "...",\n    "email": "",\n    "linkedin": "...",\n${jsonContactExtra}  },\n  "includePhoto": true,\n  "summary": "...",\n  "education": [\n    { "institution": "...", "degree": "...", "dates": "...", "description": "" }\n  ],\n  "experience": [\n    { "company": "...", "position": "...", "dates": "...", "description": "...", "projectLabel": false }\n  ],\n  "skills": {\n    "technical": ["..."],\n    "soft": ["..."]\n  },\n  "hasExperience": true\n}\n[/CV_FINAL_DATA]\n\nIMPORTANTE:\n- Si una entrada fue marcada como proyecto, debe quedar con \"projectLabel\": true dentro de \"experience\".\n- No generes una sección separada de projects.\n- Si no hay experiencias, \"experience\" puede contener entradas tipo proyecto con \"projectLabel\": true.\n- \"skills.technical\" y \"skills.soft\" deben ser arrays, nunca texto plano.\n\n${stateRule}`;
    } catch (error) {
        console.error('[buildCvGenerationPrompt] Error:', error.message);
        return `Eres el asistente de creación de CVs de NEXT. Pregunta por modo asistido, foto, datos de contacto, resumen, educación, experiencia laboral y habilidades. Después de cada experiencia, pregunta si debe aparecer como proyecto y guárdala con projectLabel dentro del array experience. Al finalizar, genera un JSON entre tags [CV_FINAL_DATA]...[/CV_FINAL_DATA].`;
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
// GET /api/coach/init
// ══════════════════════════════════════════════════════════════════════════════
export const initCoach = async (req, res) => {
    try {
        const userId = req.user.userId;
        const isInterviewMode = req.query.mode === 'interview';
        const isCvMode       = req.query.mode === 'createcv';

        // isFirstMessage = true
        let systemPrompt;
        if (isCvMode) {
            systemPrompt = await buildCvGenerationPrompt(userId, true);
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
        const { message, history, isInterviewMode, finishSimulation, isCvMode } = req.body;
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
            systemPrompt = await buildCvGenerationPrompt(userId, false);
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
        // El reporte final (finishSimulation=true) y el modo CV siempre se persisten.
        if ((!isInterviewMode || finishSimulation || isCvMode) && message) {
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
        // El reporte final y el modo CV siempre se persisten.
        if (!isInterviewMode || finishSimulation || isCvMode) {
            await Message.create({ userId, sender: 'ai', text: replyText });
        }

        return res.json({ reply: replyText });

    } catch (error) {
        console.error('[chatWithCoach] ERROR:', error.status || error.message);
        return res.status(500).json({ error: 'Servicio temporalmente fuera de línea.' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/coach/tts  → Convierte texto en audio con Google Cloud TTS Neural2
// ══════════════════════════════════════════════════════════════════════════════
export const ttsCoach = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'El campo text es requerido.' });

        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`;
        const payload = {
            input: { text },
            voice: {
                languageCode: 'es-US',
                name: 'es-US-Neural2-B', // Voz masculina natural Neural2
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,
                pitch: 0.0,
            },
        };

        const { data } = await axios.post(url, payload);
        const buffer = Buffer.from(data.audioContent, 'base64');

        res.set('Content-Type', 'audio/mpeg');
        res.set('Content-Length', buffer.length);
        return res.send(buffer);

    } catch (error) {
        console.error('[ttsCoach] Error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Error al generar la voz.' });
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