const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { query } = require('../db/database');

// ── FUNCIONES AUXILIARES ────────────────────────────────────────────────

/** Genera un Access Token JWT de vida corta (15 min por defecto) */
const generarAccessToken = (usuario) => {
  return jwt.sign(
    {
      sub:   usuario.id,     // subject: ID del usuario
      email: usuario.email,
      rol:   usuario.rol,
      nombre: usuario.nombre
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

/** Genera un Refresh Token JWT de vida larga (7 dias por defecto) */
const generarRefreshToken = (userId) => {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

/** Guarda el refresh token en la base de datos */
const guardarRefreshToken = async (userId, token) => {
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000); // exp es en segundos Unix
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
};

/** Configura la cookie HttpOnly para el refresh token */
const setCookieRefreshToken = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,   // Inaccesible para JavaScript del navegador
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en produccion
    sameSite: 'strict', // Proteccion contra CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias en milisegundos
  });
};

// ── CONTROLADORES ───────────────────────────────────────────────────────

/** POST /api/auth/registro */
const registro = async (req, res) => {
  try {
    const { email, password, nombre } = req.body;

    // Validaciones basicas:
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'email, password y nombre son requeridos' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }

    // Verificar si el email ya existe:
    const existe = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'El correo electronico ya esta registrado' });
    }

    // Hashear la contrasena con bcrypt (12 rondas de salt):
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insertar usuario en la base de datos:
    const result = await query(
      'INSERT INTO users (email, password, nombre) VALUES ($1, $2, $3) RETURNING id, email, nombre, rol',
      [email.toLowerCase(), hashedPassword, nombre]
    );
    const nuevoUsuario = result.rows[0];

    // Generar tokens:
    const accessToken  = generarAccessToken(nuevoUsuario);
    const refreshToken = generarRefreshToken(nuevoUsuario.id);
    await guardarRefreshToken(nuevoUsuario.id, refreshToken);
    setCookieRefreshToken(res, refreshToken);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      accessToken,
      user: {
        id:     nuevoUsuario.id,
        email:  nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        rol:    nuevoUsuario.rol
      }
    });

  } catch (err) {
    console.error('[AUTH] Error en registro:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/** POST /api/auth/login */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    // Buscar usuario:
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND activo = TRUE',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Mensaje generico para no revelar si el email existe o no:
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];

    // Verificar contrasena:
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Generar tokens:
    const accessToken  = generarAccessToken(usuario);
    const refreshToken = generarRefreshToken(usuario.id);
    await guardarRefreshToken(usuario.id, refreshToken);
    setCookieRefreshToken(res, refreshToken);

    res.json({
      message: 'Inicio de sesion exitoso',
      accessToken,
      user: {
        id:     usuario.id,
        email:  usuario.email,
        nombre: usuario.nombre,
        rol:    usuario.rol
      }
    });

  } catch (err) {
    console.error('[AUTH] Error en login:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/** POST /api/auth/refresh - Renueva el Access Token usando el Refresh Token */
const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ error: 'Refresh token no encontrado', code: 'RT_MISSING' });
    }

    // Verificar la firma del refresh token:
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Refresh token invalido o expirado', code: 'RT_INVALID' });
    }

    // Verificar que el token existe en BD y no fue revocado:
    const rtResult = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revocado = FALSE AND expires_at > NOW()',
      [token]
    );

    if (rtResult.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token revocado o expirado', code: 'RT_REVOKED' });
    }

    // Obtener datos actualizados del usuario:
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1 AND activo = TRUE',
      [decoded.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    // Emitir nuevo access token:
    const nuevoAccessToken = generarAccessToken(userResult.rows[0]);

    res.json({
      accessToken: nuevoAccessToken,
      message: 'Access token renovado exitosamente'
    });

  } catch (err) {
    console.error('[AUTH] Error en refresh:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/** POST /api/auth/logout */
const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      // Revocar el refresh token en la base de datos:
      await query(
        'UPDATE refresh_tokens SET revocado = TRUE WHERE token = $1',
        [token]
      );
    }

    // Limpiar la cookie:
    res.clearCookie('refreshToken');
    res.json({ message: 'Sesion cerrada exitosamente' });

  } catch (err) {
    console.error('[AUTH] Error en logout:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/** GET /api/auth/perfil - Ruta protegida de ejemplo */
const perfil = async (req, res) => {
  try {
    // req.user fue inyectado por el middleware verificarToken
    const result = await query(
      'SELECT id, email, nombre, rol, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[AUTH] Error en perfil:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { registro, login, refresh, logout, perfil };