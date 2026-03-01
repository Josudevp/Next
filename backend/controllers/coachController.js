import { GoogleGenerativeAI } from '@google/generative-ai';

// Instanciar GoogleGenerativeAI usando la variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const chatWithCoach = async (req, res) => {
    try {
        const { message, history, isInterviewMode } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'El campo message es requerido.' });
        }

        // Definir la instrucción de sistema de acuerdo al modo
        // Agregamos la fecha actual dinámicamente para que Gemini NO use placeholders como [Fecha Actual]
        const todayDate = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

        let systemInstruction = `Eres el IA Coach de NEXT, una plataforma de empleabilidad. Estás hablando con un estudiante de desarrollo de software de la Universidad de Barranquilla (IUB). Hoy es ${todayDate}. Tu objetivo es prepararlo para el mercado laboral, hacerle preguntas de entrevista técnica o darle consejos. Sé directo, motivador, y no des respuestas excesivamente largas. Nunca uses placeholders [como este].`;

        if (isInterviewMode) {
            systemInstruction = `Eres un Reclutador Técnico Senior. Estás realizando una simulación de entrevista técnica auditiva real con el usuario (candidato). Hoy es ${todayDate}. 
Debes evaluar sus respuestas técnicas, corregir errores amablemente, solicitar más detalle si es necesario, y hacer la siguiente pregunta del proceso de selección natural de IUB NEXT.
IMPORTANTE: Si el usuario decide o te pide terminar la simulación, DEBES generar de inmediato un "REPORTE FINAL" detallado de desempeño técnico basado REALMENTE en las respuestas previas del chat. Califica del 1 al 10 su nivel y menciona puntos exactos de mejora en su stack técnico (como React, Node, MySQL, etc). Dale formato usando negritas de Markdown. Sé directo y profesional, no uses frases vacías ni genéricas, y NUNCA dejes placeholders de datos sin llenar. Al comienzo de la respuesta de ese feedback incluye siempre la palabra REPORTE.`;
        }

        // Obtener el modelo con la instrucción elegida
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-pro',
            systemInstruction: systemInstruction
        });

        // Transformar el arreglo del frontend al formato que requiere Gemini API
        const formattedHistory = (history || []).map(msg => ({
            role: msg.sender === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        // Iniciar chat de Gemini conservando el historial
        const chat = model.startChat({
            history: formattedHistory,
        });

        // Enviar el nuevo mensaje para obtener la respuesta dentro de su contexto
        const result = await chat.sendMessage([{ text: message }]);

        const replyText = result.response?.text && typeof result.response.text === 'function'
            ? result.response.text()
            : null;

        if (!replyText) {
            return res.status(200).json({ reply: 'Lo siento, no pude formular una respuesta coherente en este momento.' });
        }

        // Retornar en formato JSON esperado
        return res.json({ reply: replyText });

    } catch (error) {
        console.error('Error al conectarse con Gemini API:', error);
        return res.status(500).json({
            error: 'Ocurrió un error al procesar la solicitud con el IA Coach.'
        });
    }
};
