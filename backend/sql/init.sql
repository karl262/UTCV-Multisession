-- ── EXTENSION PARA UUID ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── TABLA DE USUARIOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255),          -- NULL si el usuario usa OAuth
  nombre      VARCHAR(100) NOT NULL,
  rol         VARCHAR(50) NOT NULL DEFAULT 'user',
  oauth_provider VARCHAR(50),        -- "google", "github", NULL si es local
  oauth_id    VARCHAR(255),          -- ID del usuario en el proveedor OAuth
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── TABLA DE REFRESH TOKENS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revocado    BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── INDICES PARA RENDIMIENTO ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ── USUARIO DE PRUEBA (contrasena: Test1234!) ──────────────────────────
-- El hash corresponde a bcrypt con 12 rondas de "Test1234!"
INSERT INTO users (email, nombre, rol, password) VALUES
  ('admin@utcv.edu.mx', 'Administrador UTCV', 'admin',
   '$2b$12$placeholder_reemplazar_al_correr_setup')
ON CONFLICT (email) DO NOTHING;