const pool = require('../db/pool');

// Haversine en Node (no importamos shared/ciphers aquí para no depender de ESM)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function gpsCheckin(req, res) {
  const { teamId, puzzleId } = req.params;
  const { lat, lng } = req.body;

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'Se requieren lat y lng' });
  }

  // Obtener configuración del puzzle (incluye lat/lng del destino — solo server-side)
  const puzzleRes = await pool.query('SELECT config FROM puzzles WHERE id = $1', [puzzleId]);
  if (!puzzleRes.rows[0]) return res.status(404).json({ error: 'Puzzle no encontrado' });

  const cfg = puzzleRes.rows[0].config;
  if (!cfg.lat || !cfg.lng) {
    return res.status(400).json({ error: 'Este puzzle no tiene coordenadas configuradas' });
  }

  const distance = haversineDistance(Number(lat), Number(lng), Number(cfg.lat), Number(cfg.lng));
  const radius   = Number(cfg.radius) || 15;

  if (distance > radius) {
    return res.status(422).json({
      error: `Aún no has llegado. Estás a ${Math.round(distance)} m del destino.`,
      distance: Math.round(distance),
    });
  }

  // Dentro del radio — marcar como 'submitted' para revisión del admin
  const existing = await pool.query(
    'SELECT * FROM team_progress WHERE team_id = $1 AND puzzle_id = $2',
    [teamId, puzzleId]
  );
  if (existing.rows[0]?.status === 'approved') {
    return res.status(409).json({ error: 'Este punto ya fue aprobado' });
  }

  const answerMeta = JSON.stringify({
    type: 'gps_checkin',
    distance: Math.round(distance),
    lat: Number(lat).toFixed(6),
    lng: Number(lng).toFixed(6),
  });

  const { rows } = await pool.query(
    `INSERT INTO team_progress (team_id, puzzle_id, status, submitted_answer, submitted_at)
     VALUES ($1, $2, 'submitted', $3, NOW())
     ON CONFLICT (team_id, puzzle_id)
     DO UPDATE SET status = 'submitted', submitted_answer = $3, submitted_at = NOW(), reviewed_at = NULL
     RETURNING *`,
    [teamId, puzzleId, answerMeta]
  );
  res.status(201).json({ ...rows[0], distance: Math.round(distance) });
}

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
       t.name   AS team_name,
       p.title  AS puzzle_title,
       p.type   AS puzzle_type,
       p.config AS puzzle_config,
       p.order_index
     FROM team_progress tp
     JOIN teams   t ON t.id = tp.team_id
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

// ─── Trivia: respuesta automática ─────────────────────────────────────────────
async function triviaAnswer(req, res) {
  const { teamId, puzzleId } = req.params;
  const { questionId, answer } = req.body;
  if (answer == null) return res.status(400).json({ error: 'answer es obligatorio' });

  // Verificar que la pregunta está asignada a este puzzle
  const qRes = await pool.query(
    `SELECT q.correct_answer FROM game_questions gq
     JOIN questions q ON q.id = gq.question_id
     WHERE gq.puzzle_id = $1 AND gq.question_id = $2`,
    [puzzleId, questionId]
  );
  if (!qRes.rows[0]) return res.status(404).json({ error: 'Pregunta no asignada a este puzzle' });
  const correctAnswer = qRes.rows[0].correct_answer;

  const correct = answer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();

  // Obtener respuestas previas del equipo en este puzzle
  const existing = await pool.query(
    'SELECT * FROM team_progress WHERE team_id=$1 AND puzzle_id=$2',
    [teamId, puzzleId]
  );
  let answers = [];
  try {
    if (existing.rows[0]?.submitted_answer) {
      answers = JSON.parse(existing.rows[0].submitted_answer);
    }
  } catch {}

  // No duplicar si ya respondió esta pregunta
  if (!answers.find((a) => a.question_id === Number(questionId))) {
    answers.push({
      question_id:    Number(questionId),
      answer,
      correct,
      correct_answer: correct ? undefined : correctAnswer,
    });
  }

  // ¿Está completo? Comparar con total de preguntas asignadas
  const totalRes = await pool.query(
    'SELECT COUNT(*) FROM game_questions WHERE puzzle_id=$1', [puzzleId]
  );
  const total     = parseInt(totalRes.rows[0].count);
  const completed = answers.length >= total;
  const status    = completed ? 'approved' : 'pending';

  await pool.query(
    `INSERT INTO team_progress (team_id, puzzle_id, status, submitted_answer, submitted_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (team_id, puzzle_id)
     DO UPDATE SET status=$3, submitted_answer=$4, submitted_at=NOW(),
       reviewed_at = CASE WHEN $3='approved' THEN NOW() ELSE NULL END`,
    [teamId, puzzleId, status, JSON.stringify(answers)]
  );

  res.json({ correct, correctAnswer: correct ? null : correctAnswer, completed });
}

module.exports = { gpsCheckin, submitAnswer, reviewAnswer, getGameProgress, getRanking, triviaAnswer };
