import { GoogleGenerativeAI } from '@google/generative-ai';
import User from '../models/User.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// ── Función que obtiene el perfil desde MySQL y construye el prompt ──────────
// Añadimos isFirstMessage para controlar la máquina de estados
const buildDynamicSystemPrompt = async (userId, isInterviewMode, isFirstMessage = false) => {
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
            // Regla dinámica de estado: Si es el primer mensaje, saluda. Si no, prohibido saludar.
            const stateRule = isFirstMessage 
                ? 'REGLA DE ESTADO ACTUAL: Esta es tu PRIMERA intervención. Tu único objetivo en este turno es presentarte brevemente como Andrea Torres, mencionar que leíste su perfil y pedirle directamente que hable de su trayectoria.'
                : 'REGLA DE ESTADO ACTUAL: La entrevista ya inició. TIENES ESTRICTAMENTE PROHIBIDO saludar, decir "Bienvenido" o presentarte de nuevo. Ve directo a evaluar la respuesta del candidato y lanzar la siguiente pregunta de la fase correspondiente.';

            return `Eres Andrea Torres, Reclutadora Senior de Recursos Humanos con 12 años de experiencia. Hoy es ${todayDate}.
Estás conduciendo el PRIMER FILTRO de entrevista (Fit Cultural y Habilidades Blandas) REAL y exigente para el candidato ${user.name}. NO eres un perfil técnico profundo.

PERFIL DEL CANDIDATO:
- Área: ${areaLabel}
- Habilidades: ${skills}

${stateRule}

FLUJO LINEAL DE ENTREVISTA (Avanza solo cuando el candidato responda):
- Fase 1: Trayectoria y presentación personal.
- Fase 2: Motivación (¿Por qué nosotros? ¿Por qué esta vacante?).
- Fase 3: Introspección (Fortalezas y debilidades reales, evita clichés).
- Fase 4: Situaciones críticas (Metodología STAR: pide un logro o un conflicto resuelto).
- Fase 5: Cierre y expectativas salariales/dudas.

INSTRUCCIONES DE COMPORTAMIENTO ABSOLUTAS:
1. SOLO UNA PREGUNTA: Haz EXACTAMENTE UNA pregunta por turno.
2. NO ERES TÉCNICA: Usa las habilidades (${skills}) solo como contexto. NUNCA pidas código, algoritmos o teorías técnicas profundas.
3. CONCISIÓN: Tus respuestas deben ser MUY CORTAS (máximo 2-3 líneas) para que la conversación fluya rápido por voz.
4. ESCUCHA ACTIVA: Antes de hacer la siguiente pregunta, reacciona brevemente a lo que dijo el candidato.
5. REPORTE FINAL: Si el usuario pide finalizar, genera un informe detallado en Markdown que comience con la palabra REPORTE, calificando del 1 al 10 en: Fit Cultural, Comunicación, Autoconocimiento, Potencial.`;
        }

        return `Eres el IA Coach de NEXT, una plataforma de empleabilidad. Hoy es ${todayDate}.
Hablas con ${user.name} (Área: ${areaLabel}, Skills: ${skills}).
PERSONALIDAD: Profesional, empático y motivador. Adapta tus respuestas al mercado laboral latinoamericano.`;

    } catch (error) {
        console.error('[coachController] Error al obtener perfil:', error.message);
        return `Eres el IA Coach de NEXT. Hoy es ${todayDate}. Sé directo, motivador y profesional.`;
    }
};

// ── Helper para construir el modelo de Gemini usando systemInstruction nativo ──
const buildModel = (isReport, systemPrompt) => {
    const modelName = isReport ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const generationConfig = {
        maxOutputTokens: isReport ? 4096 : 800, // Reducido para forzar respuestas concisas
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
    
    // Inyección nativa del system prompt
    return genAI.getGenerativeModel({ 
        model: modelName, 
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig, 
        safetySettings 
    }, { apiVersion: 'v1beta' }); // Aseguramos v1beta para soporte completo de systemInstruction
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/coach/init
// ══════════════════════════════════════════════════════════════════════════════
export const initCoach = async (req, res) => {
    try {
        const userId = req.user.userId;
        const isInterviewMode = req.query.mode === 'interview';

        // isFirstMessage = true
        const systemPrompt = await buildDynamicSystemPrompt(userId, isInterviewMode, true);
        const model = buildModel(false, systemPrompt);

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
        const { message, history, isInterviewMode, finishSimulation } = req.body;
        const userId = req.user.userId;

        if (!message && !finishSimulation) {
            return res.status(400).json({ error: 'El campo message es requerido.' });
        }

        const isReportRequest = finishSimulation ||
            message?.toLowerCase().includes('reporte') ||
            message?.toLowerCase().includes('finalizar simulación');

        // isFirstMessage = false (ya estamos en el loop del chat)
        const systemPrompt = await buildDynamicSystemPrompt(userId, isInterviewMode || false, false);
        const model = buildModel(isReportRequest, systemPrompt);

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

        const result = await chat.sendMessage(prompt);
        const replyText = result.response.text();

        if (!replyText) {
            return res.status(200).json({ reply: 'Lo siento, no pude procesar tu respuesta. ¿Podrías repetirlo?' });
        }

        return res.json({ reply: replyText });

    } catch (error) {
        console.error('[chatWithCoach] ERROR:', error.status || error.message);
        return res.status(500).json({ error: 'Servicio temporalmente fuera de línea.' });
    }
};