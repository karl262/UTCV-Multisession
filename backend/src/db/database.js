const { Pool } = require('pg');

// Pool de conexiones: reutiliza conexiones en lugar de abrir/cerrar
// una nueva por cada query. Mucho mas eficiente.
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'ms_db',
  user:     process.env.DB_USER     || 'ms_user',
  password: process.env.DB_PASSWORD || '',
  max: 10,                   // maximo 10 conexiones simultaneas
  idleTimeoutMillis: 30000,  // cerrar conexiones inactivas despues de 30s
  connectionTimeoutMillis: 2000, // error si no conecta en 2s
});

// Funcion de ayuda para ejecutar queries con manejo de errores:
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB] Query: ${text} | Tiempo: ${duration}ms | Filas: ${result.rowCount}`);
    }
    return result;
  } catch (err) {
    console.error(`[DB ERROR] Query: ${text}`, err.message);
    throw err;
  }
};

// Verificar conexion al iniciar:
const testConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('[DB] Conexion a PostgreSQL exitosa');
  } catch (err) {
    console.error('[DB] Error de conexion:', err.message);
    process.exit(1);
  }
};

module.exports = { query, testConnection, pool };