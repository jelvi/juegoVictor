const pool = require('../db/pool');

async function submitAnswer(req, res) {
  const { teamId, puzzleId } = req.params;
  const { answer } = req.body;

  if (!answer) return res.status(400).json({ error: 'La respuesta no puede estar vacía' });

  const puzzleRes = await pool.query('SELECT solution FROM puzzles WHERE id = $1', [puzzleId]);
  if (!puzzleRes.rows[0]) return res.status(404).json({ error: 'Puzzle no encontrado' });

  const existing = await pool.query(
    'SELECT * FROM team_progress WHERE team_id = $1 AND puzzle_id = $2',
    [teamId, puzzleId]
  );
  if (existing.rows[0]?.status === 'approved') {
    return res.status(409).json({ error: 'Este puzzle ya fue aprobado' });
  }

  const { rows } = await pool.query(
    `INSERT INTO team_progress (team_id, puzzle_id, status, submitted_answer, submitted_at)
     VALUES ($1, $2, 'submitted', $3, NOW())
     ON CONFLICT (team_id, puzzle_id)
     DO UPDATE SET status = 'submitted', submitted_answer = $3, submitted_at = NOW(), reviewed_at = NULL
     RETURNING *`,
    [teamId, puzzleId, answer]
  );
  res.status(201).json(rows[0]);
}

async function reviewAnswer(req, res) {
  const { id } = req.params;
  const { action } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Acción no válida (approve|reject)' });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const { rows } = await pool.query(
    `UPDATE team_progress SET status = $1, reviewed_at = NOW()
     WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(rows[0]);
}

async function getGameProgress(req, res) {
  const { rows } = await pool.query(
    `SELECT
       tp.*,
       t.name  AS team_name,
       p.title AS puzzle_title,
       p.order_index
     FROM team_progress tp
     JOIN teams  t ON t.id = tp.team_id
     JOIN puzzles p ON p.id = tp.puzzle_id
     WHERE t.game_id = $1
     ORDER BY t.name, p.order_index`,
    [req.params.id]
  );
  res.json(rows);
}

async function getRanking(req, res) {
  const { rows } = await pool.query(
    `SELECT
       t.id,
       t.name,
       COUNT(tp.id) FILTER (WHERE tp.status = 'approved')  AS approved_count,
       MAX(tp.reviewed_at) FILTER (WHERE tp.status = 'approved') AS last_approval,
       (SELECT COUNT(*) FROM puzzles WHERE game_id = $1)   AS total_puzzles
     FROM teams t
     LEFT JOIN team_progress tp ON tp.team_id = t.id
     WHERE t.game_id = $1
     GROUP BY t.id, t.name
     ORDER BY approved_count DESC, last_approval ASC NULLS LAST`,
    [req.params.id]
  );
  res.json(rows);
}

module.exports = { submitAnswer, reviewAnswer, getGameProgress, getRanking };
