import User from '../models/User.js';

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

        // Devolvemos las propiedades parseadas para asegurar que sean Array
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            score: user.score,
            area: user.area || '',
            skills: safeParseJSON(user.skills),
            goals: safeParseJSON(user.goals),
            jobType: user.jobType || ''
        });

    } catch (error) {
        console.error('Error al obtener el perfil:', error);
        res.status(500).json({ mensaje: 'Error al obtener los datos del usuario' });
    }
};

// PUT /api/user/update
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { area, skills, goals, jobType } = req.body;

        // Asegurarse de que vengan como arreglos o se puedan mapear, la BD (JSON en sequelize/mysql) lo manejará
        const parsedSkills = Array.isArray(skills) ? skills : [];
        const parsedGoals = Array.isArray(goals) ? goals : [];

        // Calcular nuevo score
        const newScore = calculateScore(area, parsedSkills, parsedGoals);

        // Actualizar en BD
        await User.update({
            area: area || null,
            skills: parsedSkills,
            goals: parsedGoals,
            jobType: jobType || null,
            score: newScore
        }, {
            where: { id: userId }
        });

        // Obtener el registro actualizado
        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });

        // Retornar al frontend asegurando que parseamos los campos si el backend los casteó a string
        const userToReturn = {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            score: updatedUser.score,
            area: updatedUser.area || '',
            skills: safeParseJSON(updatedUser.skills),
            goals: safeParseJSON(updatedUser.goals),
            jobType: updatedUser.jobType || ''
        };

        res.json({
            mensaje: '¡Perfil actualizado exitosamente!',
            user: userToReturn
        });

    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al actualizar perfil' });
    }
};
