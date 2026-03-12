import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import User from '../models/User.js';

// ── Multer: memoria para ambos archivos ──────────────────────────────────────
// No guardamos el PDF en disco; solo extraemos el texto.
// La foto de perfil se convierte a base64 y se guarda en la BD.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo por archivo
    fileFilter: (_req, file, cb) => {
        if (file.fieldname === 'cv' && file.mimetype !== 'application/pdf') {
            return cb(new Error('Solo se aceptan archivos PDF para el CV'));
        }
        if (file.fieldname === 'avatar' && !file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se aceptan imágenes para la foto de perfil'));
        }
        cb(null, true);
    }
});

export const uploadMiddleware = upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cv',     maxCount: 1 },
]);

// Función para parsear JSON de forma segura (MySQL devuelve strings a veces para campos JSON)
const safeParseJSON = (data) => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    }
    return data || [];
};

const parseOptionalBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return undefined;
};

const serializeUserProfile = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    score: user.score,
    area: user.area || '',
    skills: safeParseJSON(user.skills),
    goals: safeParseJSON(user.goals),
    jobType: user.jobType || '',
    experienceLevel: user.experienceLevel || 'Sin experiencia',
    hunterNotificationsEnabled: user.hunterNotificationsEnabled !== false,
    hunterLastNotifiedAt: user.hunterLastNotifiedAt || null,
    profilePicture: user.profilePicture || null,
    hasCv: !!user.cvText,
});

// Función interna para calcular el score de empleabilidad
const calculateScore = (area, skills = [], goals = []) => {
    let newScore = 0;

    const base = 0;
    newScore += base;

    // Área confirmada
    if (area) {
        newScore += 20;
    }

    // Por cada habilidad son +10 puntos (maximo 50 puntos = 5 habilidades ponderadas)
    const skillsArray = Array.isArray(skills) ? skills : [];
    const skillPts = Math.min(skillsArray.length * 10, 50);
    newScore += skillPts;

    // Tiene metas definidas
    const goalsArray = Array.isArray(goals) ? goals : [];
    if (goalsArray.length > 0) {
        newScore += 30;
    }

    // Tope en 100
    return Math.min(newScore, 100);
};

// GET /api/user/profile
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json(serializeUserProfile(user));

    } catch (error) {
        console.error('Error al obtener el perfil:', error);
        res.status(500).json({ mensaje: 'Error al obtener los datos del usuario' });
    }
};

// PUT /api/user/update
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, area, skills, goals, jobType, experienceLevel, hunterNotificationsEnabled } = req.body;

        // Asegurarse de que vengan como arreglos o se puedan mapear, la BD (JSON en sequelize/mysql) lo manejará
        const parsedSkills = Array.isArray(skills) ? skills : [];
        const parsedGoals = Array.isArray(goals) ? goals : [];

        // Calcular nuevo score
        const newScore = calculateScore(area, parsedSkills, parsedGoals);

        // Actualizar en BD
        const updateData = {
            area: area || null,
            skills: parsedSkills,
            goals: parsedGoals,
            jobType: jobType || null,
            experienceLevel: experienceLevel || 'Sin experiencia',
            score: newScore
        };

        const parsedHunterNotificationsEnabled = parseOptionalBoolean(hunterNotificationsEnabled);
        if (parsedHunterNotificationsEnabled !== undefined) {
            updateData.hunterNotificationsEnabled = parsedHunterNotificationsEnabled;
        }

        if (name && name.trim()) {
            updateData.name = name.trim();
        }

        await User.update(updateData, {
            where: { id: userId }
        });

        // Obtener el registro actualizado
        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });

        res.json({
            mensaje: '¡Perfil actualizado exitosamente!',
            user: serializeUserProfile(updatedUser)
        });

    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al actualizar perfil' });
    }
};

// PUT /api/user/profile  (multipart/form-data — foto + CV + datos del perfil)
export const uploadProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Campos de texto (vienen en req.body cuando el content-type es multipart)
        const { name, area, skills, goals, jobType, experienceLevel, hunterNotificationsEnabled } = req.body;
        const parsedSkills = safeParseJSON(skills) ;
        const parsedGoals  = safeParseJSON(goals);
        const parsedHunterNotificationsEnabled = parseOptionalBoolean(hunterNotificationsEnabled);

        const updateData = {
            area:            area            || null,
            skills:          Array.isArray(parsedSkills) ? parsedSkills : [],
            goals:           Array.isArray(parsedGoals)  ? parsedGoals  : [],
            jobType:         jobType         || null,
            experienceLevel: experienceLevel || 'Sin experiencia',
            score:           calculateScore(area, parsedSkills, parsedGoals),
        };

        if (parsedHunterNotificationsEnabled !== undefined) {
            updateData.hunterNotificationsEnabled = parsedHunterNotificationsEnabled;
        }

        // Nombre — solo actualizamos si viene explícitamente
        if (name && name.trim()) updateData.name = name.trim();

        // ── Foto de perfil ──────────────────────────────────────────────────
        if (req.files?.avatar?.[0]) {
            const avatarFile = req.files.avatar[0];
            const base64 = avatarFile.buffer.toString('base64');
            updateData.profilePicture = `data:${avatarFile.mimetype};base64,${base64}`;
        }

        // ── CV en PDF → extraer texto ───────────────────────────────────────
        if (req.files?.cv?.[0]) {
            let parser;
            try {
                parser = new PDFParse({ data: req.files.cv[0].buffer });
                const pdfData = await parser.getText();

                // Limitar a 15.000 caracteres para no saturar el prompt de Gemini
                updateData.cvText = pdfData.text.trim().slice(0, 15000);
                console.log(`[uploadProfile] CV procesado — ${updateData.cvText.length} caracteres extraídos`);
            } catch (pdfErr) {
                console.error('[uploadProfile] Error al parsear PDF:', pdfErr.message);
                return res.status(422).json({ mensaje: 'No se pudo leer el PDF. Asegúrate de que no esté protegido con contraseña.' });
            } finally {
                if (parser) {
                    await parser.destroy().catch(() => {});
                }
            }
        }

        await User.update(updateData, { where: { id: userId } });

        const updatedUser = await User.findByPk(userId, { attributes: { exclude: ['password'] } });

        return res.json({
            mensaje: '¡Perfil actualizado exitosamente!',
            user: serializeUserProfile(updatedUser)
        });

    } catch (error) {
        console.error('Error en uploadProfile:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al actualizar perfil' });
    }
};

export const deleteProfilePicture = async (req, res) => {
    try {
        const userId = req.user.userId;

        await User.update({ profilePicture: null }, { where: { id: userId } });

        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });

        if (!updatedUser) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        return res.json({
            mensaje: 'Foto de perfil eliminada correctamente.',
            user: serializeUserProfile(updatedUser)
        });
    } catch (error) {
        console.error('Error al eliminar la foto de perfil:', error);
        return res.status(500).json({ mensaje: 'No se pudo eliminar la foto de perfil.' });
    }
};

export const deleteCv = async (req, res) => {
    try {
        const userId = req.user.userId;

        await User.update({ cvText: null }, { where: { id: userId } });

        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });

        if (!updatedUser) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        return res.json({
            mensaje: 'CV eliminado correctamente.',
            user: serializeUserProfile(updatedUser)
        });
    } catch (error) {
        console.error('Error al eliminar el CV:', error);
        return res.status(500).json({ mensaje: 'No se pudo eliminar el CV.' });
    }
};
