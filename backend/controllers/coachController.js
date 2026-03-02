import { GoogleGenerativeAI } from '@google/generative-ai';

// Instanciar GoogleGenerativeAI usando la variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const chatWithCoach = async (req, res) => {
    try {
        const { message, history, isInterviewMode, finishSimulation } = req.body;

        if (!message && !finishSimulation) {
            return res.status(400).json({ error: 'El campo message es requerido.' });
        }

        // Lógica de Model Switching: 
        // 2.5-flash para velocidad/costo en chat normal (Tier 1: 10,000 RPD)
        // 2.5-pro para razonamiento profundo en el REPORTE FINAL (Tier 1: High Reasoning)
        const isReportRequest = finishSimulation ||
            message?.toLowerCase().includes('reporte') ||
            message?.toLowerCase().includes('finalizar simulación');

        const modelName = isReportRequest ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

        // Definir la instrucción de sistema de acuerdo al modo
        const todayDate = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

        let systemInstructionText = `Eres el IA Coach de NEXT. Estás hablando con un estudiante de desarrollo de software de la IUB. Hoy es ${todayDate}. Sé directo, motivador y profesional.`;

        if (isInterviewMode) {
            systemInstructionText = `Eres un Reclutador Técnico Senior. Realizas una simulación de entrevista técnica real. 
Evalúa respuestas técnicas con precisión. 
IMPORTANTE: Si se solicita el reporte, genera un "REPORTE FINAL" detallado. Analiza el desempeño técnico real (React, Node, etc). Califica del 1 al 10. Incluye siempre la palabra REPORTE al inicio.`;
        }

        // Configuración de producción para Tier 1 (Aprovechar Cuotas)
        const generationConfig = {
            maxOutputTokens: isReportRequest ? 4096 : 2048,
            temperature: isReportRequest ? 0.35 : 0.65,
            topP: 0.95,
            topK: 40,
        };

        // Configuración de Seguridad para evitar bloqueos en respuestas técnicas
        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ];

        // Modelo limpio — sin systemInstruction para evitar el 400 en v1
        console.log('--- CONECTANDO A GEMINI ---', modelName);
        const model = genAI.getGenerativeModel(
            {
                model: modelName,
                generationConfig,
                safetySettings
            },
            { apiVersion: 'v1' }
        );

        // Transformar y Limpiar Historial
        let cleanedHistory = (history || []).map(msg => ({
            role: msg.sender === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        // Garantizar que el historial no empiece con un turno 'model'
        if (cleanedHistory.length > 0 && cleanedHistory[0].role === 'model') {
            cleanedHistory.shift();
        }

        // ✅ Inyección antibloqueo: systemInstruction como turnos estándar user/model
        const baseHistory = [
            {
                role: 'user',
                parts: [{ text: `INSTRUCCIÓN DEL SISTEMA (Adopta esta personalidad estrictamente): ${systemInstructionText}` }]
            },
            {
                role: 'model',
                parts: [{ text: 'Entendido. Actuaré exactamente como has descrito.' }]
            }
        ];

        const finalHistory = [...baseHistory, ...cleanedHistory];

        const chat = model.startChat({
            history: finalHistory,
        });

        // Enviar mensaje o comando de finalización
        const prompt = finishSimulation ? "Genera ahora el REPORTE FINAL de mi entrevista basado en nuestra conversación." : message;
        const result = await chat.sendMessage(prompt);

        const response = await result.response;
        const replyText = response.text();

        if (!replyText) {
            return res.status(200).json({ reply: 'Lo siento, no pude procesar la respuesta. Por favor intenta de nuevo.' });
        }

        return res.json({ reply: replyText });

    } catch (error) {
        console.error('--- ERROR EN GEMINI API ---');
        console.error('Status:', error.status);
        console.error('Message:', error.message);

        // Manejo de Errores Profesional (Billing / Quota / Safety)
        if (error.status === 429) {
            return res.status(429).json({
                error: 'Estamos recibiendo muchas solicitudes. Por favor, espera un momento antes de continuar.'
            });
        }

        if (error.message.includes('billing') || error.status === 402) {
            return res.status(503).json({
                error: 'Nuestro sistema de IA está en mantenimiento técnico de créditos. Volverá en unos minutos.'
            });
        }

        if (error.message.includes('safety') || error.message.includes('blocked')) {
            return res.status(403).json({
                error: 'La respuesta fue bloqueada por filtros de seguridad. Por favor, reformula tu pregunta.'
            });
        }

        return res.status(500).json({
            error: 'Servicio temporalmente fuera de línea. Nuestro equipo técnico ya está trabajando en ello.'
        });
    }
};
