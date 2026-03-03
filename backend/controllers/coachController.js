import { GoogleGenerativeAI } from '@google/generative-ai';
import User from '../models/User.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Catálogo de etiquetas legibles (espeja los ids del Onboarding) ──────────
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

// ── Función que obtiene el perfil desde MySQL y construye el prompt ──────────
const buildDynamicSystemPrompt = async (userId, isInterviewMode) => {
    const todayDate = new Date().toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    try {
        const user = await User.findByPk(userId, {
            attributes: ['name', 'area', 'skills', 'goals', 'jobType']
        });

        if (!user) throw new Error('Usuario no encontrado en la DB');

        const areaLabel = AREA_LABELS[user.area] || user.area || 'área no especificada';
        const jobTypeLabel = JOB_TYPE_LABELS[user.jobType] || user.jobType || 'oportunidad laboral';
        const skills = Array.isArray(user.skills) && user.skills.length > 0
            ? user.skills.join(', ')
            : 'habilidades no especificadas';
        const goalsList = Array.isArray(user.goals) && user.goals.length > 0
            ? user.goals.map(g => GOAL_LABELS[g] || g).join(', ')
            : 'sin metas específicas aún';

        if (isInterviewMode) {
            // Reglas de comportamiento específicas por área del candidato
            let areaSpecificRules = '';
            switch (user.area) {
                case 'finance':
                case 'business':
                    areaSpecificRules = `COMPORTAMIENTO ESPECÍFICO PARA ESTE CANDIDATO:
- Enfócate en escenarios de riesgo financiero, ética profesional y manejo de crisis organizacionales.
- Exige ejemplos concretos de toma de decisiones bajo presión económica o con dilemas éticos.
- Pregunta por herramientas: Excel avanzado, Power BI, ERP, análisis de estados financieros.
- Evalúa el razonamiento numérico y la capacidad de comunicar datos complejos con claridad.`;
                    break;
                case 'tech':
                case 'engineering':
                case 'science':
                    areaSpecificRules = `COMPORTAMIENTO ESPECÍFICO PARA ESTE CANDIDATO:
- Exige ejemplos reales de arquitectura, resolución de bugs críticos o patrones de diseño aplicados.
- Haz preguntas situacionales: "Cuéntame de un momento en que tu código falló en producción. ¿Cómo lo resolviste?"
- Profundiza en las habilidades declaradas (${skills}). Si mencionó React, pregunta por optimización de renders. Si mencionó SQL, pregunta por índices y queries complejas.
- Evalúa pensamiento lógico, depuración y comunicación técnica.`;
                    break;
                case 'health':
                    areaSpecificRules = `COMPORTAMIENTO ESPECÍFICO PARA ESTE CANDIDATO:
- Enfócate en escenarios de trabajo bajo presión extrema, toma de decisiones clínicas rápidas y empatía con el paciente.
- Pregunta por situaciones reales: manejo de pacientes difíciles, errores y protocolos de emergencia.
- Evalúa inteligencia emocional, ética médica y capacidad de trabajo interdisciplinario.`;
                    break;
                case 'design':
                case 'marketing':
                    areaSpecificRules = `COMPORTAMIENTO ESPECÍFICO PARA ESTE CANDIDATO:
- Pide que describa su proceso creativo y cómo mide el impacto de su trabajo.
- Pregunta por proyectos de portafolio, un briefing difícil, o cómo manejó feedback negativo de un cliente.
- Evalúa la capacidad de conectar creatividad con resultados de negocio medibles.`;
                    break;
                case 'law':
                    areaSpecificRules = `COMPORTAMIENTO ESPECÍFICO PARA ESTE CANDIDATO:
- Plantea dilemas éticos y jurídicos reales. Evalúa el razonamiento legal y la solidez argumentativa.
- Pregunta por casos donde tuvo que defender una postura impopular o resolver un conflicto de intereses.
- Evalúa claridad en la comunicación oral y el manejo de la presión.`;
                    break;
                case 'education':
                    areaSpecificRules = `COMPORTAMIENTO ESPECÍFICO PARA ESTE CANDIDATO:
- Pregunta por estrategias pedagógicas concretas y cómo adapta la enseñanza a distintos perfiles de estudiantes.
- Plantea el escenario de un grupo difícil o un alumno con necesidades especiales.
- Evalúa vocación, paciencia y dominio de herramientas digitales educativas.`;
                    break;
                default:
                    areaSpecificRules = `COMPORTAMIENTO ESPECÍFICO PARA ESTE CANDIDATO:
- Usa el método STAR (Situación, Tarea, Acción, Resultado) para estructurar preguntas de comportamiento.
- Profundiza en las habilidades declaradas: ${skills}.
- Evalúa trabajo en equipo, resolución de problemas y adaptabilidad.`;
            }

            return `Eres Andrea Torres, Reclutadora Senior de Recursos Humanos con 12 años de experiencia seleccionando talento joven en Latinoamérica. Hoy es ${todayDate}.
Estás conduciendo una simulación de entrevista REAL y exigente para el candidato ${user.name}.

PERFIL DEL CANDIDATO (extraído de la plataforma NEXT):
- Área profesional: ${areaLabel}
- Habilidades declaradas: ${skills}
- Oportunidad que busca: ${jobTypeLabel}
- Metas profesionales: ${goalsList}

PERSONALIDAD Y TONO:
- Eres estricta pero justa, profesional y directa. No eres amigable en exceso, pero tampoco hostil.
- Tus respuestas son CORTAS y CONVERSACIONALES (máximo 3 o 4 líneas antes de la pregunta).
- Antes de hacer la siguiente pregunta, REACCIONA brevemente a lo que dijo el candidato: una observación de 1 línea como "Interesante enfoque." / "Bien, eso es lo que buscamos." / "Eso podría mejorarse." Luego haz la siguiente pregunta.
- Usas español latinoamericano formal. Sin jerga informal.
- No repitas constantemente que eres "Andrea Torres" o tu cargo si ya te presentaste al inicio de la conversación.

${areaSpecificRules}

REGLAS ABSOLUTAS:
1. Haz EXACTAMENTE UNA pregunta por turno. Nunca hagas dos preguntas en el mismo mensaje.
2. TU PRIMER MENSAJE (si no hay historial): bienvenida formal breve (2 líneas) + primera pregunta de entrevista. Ve directo al grano.
3. Si el candidato da respuestas cortas, vagas o "fuera de personaje" (ej. "no sé", "solo pruebo la app"), no seas robótico. Reacciona profesionalmente: "Entiendo que estés probando, pero para efectos de esta simulación, necesito que intentes profundizar en..." o "Como reclutadora, mi labor es identificar tu potencial incluso en la duda. Intenta decirme..."
4. Aumenta la dificultad progresivamente a lo largo de la conversación.
4. NUNCA hagas preguntas de programación o código si el área no es tecnología/ingeniería.
5. Al solicitar el REPORTE, genera un informe detallado en Markdown que comience con la palabra REPORTE. Califica del 1 al 10 en: Conocimiento del área, Comunicación, Manejo de la presión, Potencial de crecimiento. Sé honesta y constructiva.`;
        }

        return `Eres el IA Coach de NEXT, una plataforma de empleabilidad para universitarios latinoamericanos. Hoy es ${todayDate}.
Estás hablando con ${user.name}, quien pertenece al área de ${areaLabel}.
Sus habilidades son: ${skills}.
Está buscando: ${jobTypeLabel}.
Sus metas en la plataforma: ${goalsList}.

PERSONALIDAD: Eres profesional, empático y motivador. Orientas tus consejos al contexto real de ${areaLabel} en el mercado laboral colombiano/latinoamericano.
REGLA: Adapta siempre tus respuestas y ejemplos al área del usuario. No des consejos genéricos de programación a alguien de Finanzas o Diseño.`;

    } catch (error) {
        console.error('[coachController] Error al obtener perfil para prompt dinámico:', error.message);
        // Prompt genérico de fallback si la DB falla
        return `Eres el IA Coach de NEXT, una plataforma de empleabilidad universitaria. Hoy es ${todayDate}. Sé directo, motivador y profesional.`;
    }
};

// ── Helper para construir el modelo de Gemini ────────────────────────────────
const buildModel = (isReport) => {
    const modelName = isReport ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const generationConfig = {
        maxOutputTokens: isReport ? 4096 : 2048,
        temperature: isReport ? 0.35 : 0.65,
        topP: 0.95,
        topK: 40,
    };
    const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ];
    console.log(`[Gemini] Modelo seleccionado: ${modelName}`);
    return genAI.getGenerativeModel({ model: modelName, generationConfig, safetySettings }, { apiVersion: 'v1' });
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/coach/init  → Genera el primer mensaje personalizado de bienvenida
// Requiere: authMiddleware (req.user.userId)
// ══════════════════════════════════════════════════════════════════════════════
export const initCoach = async (req, res) => {
    try {
        const userId = req.user.userId;
        // El frontend pasa ?mode=interview cuando arranca la simulación
        const isInterviewMode = req.query.mode === 'interview';

        const systemPrompt = await buildDynamicSystemPrompt(userId, isInterviewMode);
        const model = buildModel(false);

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: `INSTRUCCIÓN DEL SISTEMA: ${systemPrompt}` }] },
                { role: 'model', parts: [{ text: 'Entendido. Aplicaré exactamente esta personalidad y contexto.' }] }
            ]
        });

        const openingPrompt = isInterviewMode
            // Pedir primera pregunta de entrevista contextualizada al área del usuario
            ? 'Preséntate de forma muy ejecutiva, dile que eres Andrea Torres de NEXT y lanza la PRIMERA pregunta de la entrevista basada en su perfil. Sé directa y profesional. Máximo 2 oraciones.'
            // Pedir saludo personalizado para el chat normal
            : 'Saluda al usuario por su nombre, preséntate brevemente como su Coach de NEXT, y haz un comentario rápido sobre su perfil para iniciar. Máximo 2 oraciones.';

        const result = await chat.sendMessage(openingPrompt);
        const reply = result.response.text();

        return res.json({ reply });

    } catch (error) {
        console.error('[initCoach] Error:', error.message);
        return res.status(500).json({
            reply: '¡Hola! Soy tu IA Coach de NEXT. Estoy aquí para ayudarte con tu preparación profesional. ¿En qué te puedo ayudar hoy?'
        });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/coach/chat → Maneja los mensajes del chat (normal + entrevista)
// Requiere: authMiddleware (req.user.userId)
// ══════════════════════════════════════════════════════════════════════════════
export const chatWithCoach = async (req, res) => {
    try {
        const { message, history, isInterviewMode, finishSimulation } = req.body;
        const userId = req.user.userId;

        if (!message && !finishSimulation) {
            return res.status(400).json({ error: 'El campo message es requerido.' });
        }

        const isReportRequest = finishSimulation ||
            message?.toLowerCase().includes('reporte') ||
            message?.toLowerCase().includes('finalizar simulación');

        // Prompt dinámico basado en DB
        const systemPrompt = await buildDynamicSystemPrompt(userId, isInterviewMode || false);
        const model = buildModel(isReportRequest);

        // Limpiar y preparar historial
        let cleanedHistory = (history || [])
            .filter(msg => msg.id !== 'init') // Excluir el mensaje de bienvenida del historial
            .map(msg => ({
                role: msg.sender === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }));

        // El historial nunca puede empezar con un turno 'model'
        if (cleanedHistory.length > 0 && cleanedHistory[0].role === 'model') {
            cleanedHistory.shift();
        }

        const baseHistory = [
            { role: 'user', parts: [{ text: `INSTRUCCIÓN DEL SISTEMA: ${systemPrompt}` }] },
            { role: 'model', parts: [{ text: 'Entendido. Aplicaré exactamente esta personalidad y contexto.' }] },
            ...cleanedHistory
        ];

        const chat = model.startChat({ history: baseHistory });

        const prompt = finishSimulation
            ? 'Genera ahora el REPORTE FINAL de mi entrevista basado en nuestra conversación.'
            : message;

        const result = await chat.sendMessage(prompt);
        const replyText = result.response.text();

        if (!replyText) {
            return res.status(200).json({ reply: 'Lo siento, no pude procesar la respuesta. Intenta de nuevo.' });
        }

        return res.json({ reply: replyText });

    } catch (error) {
        console.error('[chatWithCoach] ERROR:', error.status, error.message);

        if (error.status === 429) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.' });
        if (error.message?.includes('billing') || error.status === 402) return res.status(503).json({ error: 'Sistema de IA en mantenimiento. Intenta más tarde.' });
        if (error.message?.includes('safety') || error.message?.includes('blocked')) return res.status(403).json({ error: 'Respuesta bloqueada por filtros de seguridad. Reformula tu pregunta.' });

        return res.status(500).json({ error: 'Servicio temporalmente fuera de línea.' });
    }
};
