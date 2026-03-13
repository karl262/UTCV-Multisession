const express              = require('express');
const { registro,
        login,
        refresh,
        logout,
        perfil }           = require('../controllers/auth.controller');
const { verificarToken }   = require('../middleware/auth.middleware');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('../db/database');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ── RUTAS PUBLICAS (no requieren token) ───────────────────────────────
router.post('/registro', registro);
router.post('/login',    login);
router.post('/refresh',  refresh);
router.post('/logout',   logout);

// ── RUTAS PROTEGIDAS (requieren Access Token valido) ──────────────────
router.get('/perfil', verificarToken, perfil);

// ── CONFIGURAR LA ESTRATEGIA GOOGLE ────────────────────────────────────
passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Buscar si ya existe el usuario con este Google ID:
      let result = await query(
        'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
        ['google', profile.id]
      );

      let usuario;
      if (result.rows.length > 0) {
        // Usuario existente:
        usuario = result.rows[0];
      } else {
        // Crear nuevo usuario con los datos de Google:
        const email  = profile.emails[0].value;
        const nombre = profile.displayName;

        // Verificar si el email ya existe como cuenta local:
        const emailExiste = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailExiste.rows.length > 0) {
          // Vincular la cuenta Google a la cuenta local existente:
          await query(
            'UPDATE users SET oauth_provider=$1, oauth_id=$2 WHERE email=$3',
            ['google', profile.id, email]
          );
          usuario = emailExiste.rows[0];
        } else {
          // Crear cuenta nueva:
          const insertResult = await query(
            'INSERT INTO users (email, nombre, oauth_provider, oauth_id) VALUES ($1,$2,$3,$4) RETURNING *',
            [email, nombre, 'google', profile.id]
          );
          usuario = insertResult.rows[0];
        }
      }

      return done(null, usuario);
    } catch (err) {
      return done(err, null);
    }
  }
));

// ── RUTAS OAUTH (agregar en auth.routes.js) ─────────────────────────────

// 1. Iniciar el flujo OAuth: redirige al usuario a Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// 2. Callback: Google redirige aqui despues de que el usuario autoriza
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      const usuario = req.user;

      // Generar tokens propios de tu aplicacion:
      const accessToken  = jwt.sign(
        { sub: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      const refreshToken = jwt.sign(
        { sub: usuario.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Guardar refresh token en BD:
      const decoded = jwt.decode(refreshToken);
      await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [usuario.id, refreshToken, new Date(decoded.exp * 1000)]
      );

      // Enviar refresh token en cookie HttpOnly:
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',  // 'lax' para que funcione con redirects OAuth
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      // Redirigir al frontend con el access token en la URL:
      // (El frontend lo lee, lo guarda en memoria y limpia la URL)
      res.redirect(`http://localhost:4200/oauth-callback?token=${accessToken}`);

    } catch (err) {
      res.redirect('http://localhost:4200/login?error=oauth_error');
    }
  }
);

module.exports = router;