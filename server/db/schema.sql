-- ============================================================
-- Yincana — Schema v1
-- Ejecutar: psql $DATABASE_URL -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Administradores
CREATE TABLE IF NOT EXISTS admins (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Juegos
CREATE TABLE IF NOT EXISTS games (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'active', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipos
CREATE TABLE IF NOT EXISTS teams (
  id           SERIAL PRIMARY KEY,
  game_id      INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  invite_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Miembros de equipo (nickname libre, sin cuenta)
CREATE TABLE IF NOT EXISTS team_members (
  id         SERIAL PRIMARY KEY,
  team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  nickname   VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Puzzles
CREATE TABLE IF NOT EXISTS puzzles (
  id             SERIAL PRIMARY KEY,
  game_id        INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  order_index    INTEGER NOT NULL DEFAULT 0,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  type           VARCHAR(50) NOT NULL,
  config         JSONB NOT NULL DEFAULT '{}',
  solution       TEXT NOT NULL,
  hint_material  JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id, order_index)
);

-- Progreso por equipo
CREATE TABLE IF NOT EXISTS team_progress (
  id               SERIAL PRIMARY KEY,
  team_id          INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  puzzle_id        INTEGER NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  submitted_answer TEXT,
  submitted_at     TIMESTAMPTZ,
  reviewed_at      TIMESTAMPTZ,
  UNIQUE (team_id, puzzle_id)
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_teams_game      ON teams(game_id);
CREATE INDEX IF NOT EXISTS idx_puzzles_game    ON puzzles(game_id, order_index);
CREATE INDEX IF NOT EXISTS idx_progress_team   ON team_progress(team_id);
CREATE INDEX IF NOT EXISTS idx_progress_puzzle ON team_progress(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON team_progress(status);
