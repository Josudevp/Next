import User from '../models/User.js';

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/cv/save  — guarda el JSON del CV en la BD
//  La generación del PDF ocurre en el navegador del usuario (CVTemplate.jsx)
// ─────────────────────────────────────────────────────────────────────────────
export const saveCvData = async (req, res) => {
    try {
        const cvData = req.body;
        if (!cvData || !cvData.personalInfo) {
            return res.status(400).json({ error: 'Datos de CV inválidos o incompletos.' });
        }

        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ error: 'No autorizado.' });

        await User.update(
            { cvText: JSON.stringify(cvData) },
            { where: { id: userId } }
        );

        return res.json({ success: true, message: 'CV guardado correctamente.' });
    } catch (error) {
        console.error('[cvController] Error guardando CV:', error.message);
        return res.status(500).json({ error: 'No se pudo guardar el CV. Intenta de nuevo.' });
    }
};

