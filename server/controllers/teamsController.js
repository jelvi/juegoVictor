const pool = require('../db/pool');

async function listTeams(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM teams WHERE game_id = $1 ORDER BY created_at ASC',
    [req.params.id]
  );
  res.json(rows);
}

async function createTeam(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const { rows } = await pool.query(
    'INSERT INTO teams (game_id, name) VALUES ($1, $2) RETURNING *',
    [req.params.id, name]
  );
  res.status(201).json(rows[0]);
}

async function joinByToken(req, res) {
  const { rows } = await pool.query(
    `SELECT t.*, g.name AS game_name, g.status AS game_status
     FROM teams t JOIN games g ON g.id = t.game_id
     WHERE t.invite_token = $1`,
    [req.params.token]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Enlace de invitación no válido' });
  res.json(rows[0]);
}

async function addMember(req, res) {
  const { nickname } = req.body;
  if (!nickname) return res.status(400).json({ error: 'El apodo es obligatorio' });

  // Evitar duplicados en el mismo equipo
  const existing = await pool.query(
    'SELECT id FROM team_members WHERE team_id = $1 AND LOWER(nickname) = LOWER($2)',
    [req.params.id, nickname]
  );
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'Ya existe un miembro con ese apodo en el equipo' });
  }

  const { rows } = await pool.query(
    'INSERT INTO team_members (team_id, nickname) VALUES ($1, $2) RETURNING *',
    [req.params.id, nickname]
  );
  res.status(201).json(rows[0]);
}

async function updateTeam(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const { rows } = await pool.query(
    'UPDATE teams SET name = $1 WHERE id = $2 RETURNING *',
    [name, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Equipo no encontrado' });
  res.json(rows[0]);
}

module.exports = { listTeams, createTeam, joinByToken, addMember, updateTeam };
