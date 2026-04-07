import jwt from 'jsonwebtoken';

// [SECURITY] Fail-fast: si JWT_SECRET no está definida, el middleware no puede
// operar de forma segura. Lanzar error en arranque evita el fallback a clave predecible.
if (!process.env.JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET no está definida en las variables de entorno. El servidor no puede operar de forma segura.');
    process.exit(1);
}

export const authMiddleware = (req, res, next) => {
    // Buscar en el header de la petición (Bearer {token})
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ mensaje: 'No autorizado, no hay token provisto' });
    }

    try {
        const token = authHeader.split(' ')[1];

        // [SECURITY] Sin fallback — JWT_SECRET debe existir o el proceso ya habría terminado.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        // No exponer detalles del error al cliente (information disclosure)
        return res.status(401).json({ mensaje: 'No autorizado, token inválido' });
    }
};
