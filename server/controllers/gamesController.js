const pool = require('../db/pool');

async function listGames(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM games ORDER BY created_at DESC'
  );
  res.json(rows);
}

async function createGame(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const { rows } = await pool.query(
    'INSERT INTO games (name) VALUES ($1) RETURNING *',
    [name]
  );
  res.status(201).json(rows[0]);
}

async function getGame(req, res) {
  const { rows } = await pool.query('SELECT * FROM games WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Juego no encontrado' });
  res.json(rows[0]);
}

async function updateGameStatus(req, res) {
  const { status } = req.body;
  const valid = ['draft', 'active', 'finished'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  const { rows } = await pool.query(
    'UPDATE games SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Juego no encontrado' });
  res.json(rows[0]);
}

module.exports = { listGames, createGame, getGame, updateGameStatus };
