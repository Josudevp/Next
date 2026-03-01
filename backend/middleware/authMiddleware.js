import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
    // Buscar en el header de la petición (Bearer {token})
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ mensaje: 'No autorizado, no hay token provisto' });
    }

    try {
        const token = authHeader.split(' ')[1];

        // Decodificar el token usando la clave secreta
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');

        // Adjuntar el ID del usuario al request (depende de cómo guardaste el payload en authController)
        // Generalmente es { id: userId }
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'No autorizado, token inválido' });
    }
};
