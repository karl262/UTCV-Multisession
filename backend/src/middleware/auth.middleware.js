const jwt = require('jsonwebtoken');

/**
 * Middleware que verifica el Access Token JWT en cada peticion.
 * Si el token es valido, agrega los datos del usuario a req.user
 * y pasa al siguiente middleware.
 * Si el token no existe o es invalido, responde con 401 o 403.
 */
const verificarToken = (req, res, next) => {
  // El token llega en el header: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token de acceso requerido',
      code: 'TOKEN_MISSING'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify lanza una excepcion si el token es invalido o expiro.
    // Si es valido, retorna el payload decodificado.
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Adjuntamos el payload al objeto req para usarlo en el controlador:
    req.user = {
      id:    decoded.sub,
      email: decoded.email,
      rol:   decoded.rol
    };

    next(); // Todo bien, continua al siguiente middleware o controlador

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'El token de acceso ha expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    // JsonWebTokenError, NotBeforeError, etc.
    return res.status(403).json({
      error: 'Token de acceso invalido',
      code: 'TOKEN_INVALID'
    });
  }
};

/**
 * Middleware de autorizacion por rol.
 * Uso: requireRol("admin")
 * Siempre usar DESPUES de verificarToken.
 */
const requireRol = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    next();
  };
};

module.exports = { verificarToken, requireRol };