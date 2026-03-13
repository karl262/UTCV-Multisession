require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes   = require('./routes/auth.routes');
const { testConnection } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARES GLOBALES ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true, // CRITICO: permite enviar cookies entre dominios
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());         // Parsear cuerpo JSON
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());         // Parsear cookies

// ── RUTAS ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Ruta de verificacion de salud del servidor:
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejo de rutas no encontradas:
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo global de errores:
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── INICIAR SERVIDOR ────────────────────────────────────────────────
const start = async () => {
  await testConnection(); // Verificar BD antes de aceptar trafico
  app.listen(PORT, () => {
    console.log(`[SERVER] Backend corriendo en http://localhost:${PORT}`);
    console.log(`[SERVER] Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();