const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'secret_super_seguro_unefa';

exports.verifyToken = (req, res, next) => {
    // 1. Buscamos el token en la cabecera (Header)
    const authHeader = req.headers['authorization'];

    // El formato suele ser "Bearer <token>", así que separamos la palabra "Bearer"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }

    // 2. Verificamos si el token es real y no ha expirado
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token inválido o expirado.' });
        }

        // 3. Si todo está bien, guardamos los datos del usuario en la petición (req)
        req.user = decoded; // Aquí va el { id, role }
        next(); // Dejamos pasar a la siguiente función (el controlador)
    });
};

// Middleware extra: Solo permitir ciertos roles
exports.verifyRole = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.user || !rolesPermitidos.includes(req.user.role)) {
            return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
        }
        next();
    };
};