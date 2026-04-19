const pool = require('../db/pool');
const loadCiphers = require('../lib/ciphers');

async function ciphers() { return loadCiphers(); }

// ─── Admin: listar puzzles de un juego ────────────────────────────────────────
async function listPuzzles(req, res) {
  const { rows } = await pool.query(
    `SELECT p.*,
       (SELECT COUNT(*) FROM game_questions gq WHERE gq.puzzle_id = p.id) AS question_count
     FROM puzzles p
     WHERE p.game_id = $1
     ORDER BY p.order_index ASC`,
    [req.params.id]
  );
  res.json(rows);
}

// ─── Admin: crear puzzle ──────────────────────────────────────────────────────
async function createPuzzle(req, res) {
  try {
    const { encode, generateHintMaterial, listTypes } = await ciphers();
    const { title, description, type, config, solution, order_index } = req.body;

    if (!title || !type || !solution) {
      return res.status(400).json({ error: 'title, type y solution son obligatorios' });
    }
    if (!listTypes().includes(type)) {
      return res.status(400).json({ error: `Tipo desconocido. Válidos: ${listTypes().join(', ')}` });
    }

    const cfg = config || {};
    const hintMaterial = generateHintMaterial(type, cfg);
    const encodedText  = encode(type, solution, cfg);
    const fullConfig   = { ...cfg, encodedText };

    const { rows } = await pool.query(
      `INSERT INTO puzzles (game_id, order_index, title, description, type, config, solution, hint_material)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.params.id, order_index ?? 0, title, description || '',
        type, JSON.stringify(fullConfig), solution, JSON.stringify(hintMaterial),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

// ─── Admin: editar puzzle ─────────────────────────────────────────────────────
async function updatePuzzle(req, res) {
  try {
    const { encode, generateHintMaterial, listTypes } = await ciphers();
    const { title, description, type, config, solution, order_index } = req.body;

    const existing = await pool.query('SELECT * FROM puzzles WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Puzzle no encontrado' });
    const puzzle = existing.rows[0];

    const newType     = type     ?? puzzle.type;
    const newSolution = solution ?? puzzle.solution;
    const newConfig   = config   ?? puzzle.config;

    if (!listTypes().includes(newType)) {
      return res.status(400).json({ error: `Tipo desconocido. Válidos: ${listTypes().join(', ')}` });
    }

    const hintMaterial = generateHintMaterial(newType, newConfig);
    const encodedText  = encode(newType, newSolution, newConfig);
    const fullConfig   = { ...newConfig, encodedText };

    const { rows } = await pool.query(
      `UPDATE puzzles SET title=$1, description=$2, type=$3, config=$4,
         solution=$5, hint_material=$6, order_index=$7
       WHERE id=$8 RETURNING *`,
      [
        title ?? puzzle.title, description ?? puzzle.description,
        newType, JSON.stringify(fullConfig), newSolution,
        JSON.stringify(hintMaterial), order_index ?? puzzle.order_index,
        req.params.id,
      ]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Ya existe otro puzzle con ese número de orden. Usa un número diferente.' });
    }
    res.status(500).json({ error: e.message });
  }
}

// ─── Equipo: obtener puzzle actual ────────────────────────────────────────────
async function getCurrentPuzzle(req, res) {
  const teamId = req.params.id;

  const teamRes = await pool.query('SELECT game_id FROM teams WHERE id=$1', [teamId]);
  if (!teamRes.rows[0]) return res.status(404).json({ error: 'Equipo no encontrado' });
  const gameId = teamRes.rows[0].game_id;

  const puzzlesRes = await pool.query(
    'SELECT * FROM puzzles WHERE game_id=$1 ORDER BY order_index ASC', [gameId]
  );
  const puzzles = puzzlesRes.rows;
  if (!puzzles.length) return res.json({ puzzle: null, status: 'no_puzzles' });

  const progressRes = await pool.query(
    'SELECT * FROM team_progress WHERE team_id=$1', [teamId]
  );
  const progressMap = {};
  for (const p of progressRes.rows) progressMap[p.puzzle_id] = p;

  for (const puzzle of puzzles) {
    const prog = progressMap[puzzle.id];
    if (prog?.status === 'approved') continue;

    const { solution, ...safePuzzle } = puzzle;

    // ── Physical: ocultar instrucciones del árbitro ───────────────────────────
    if (safePuzzle.type === 'physical' && safePuzzle.config) {
      const { refereeInstructions, ...safeConfig } = safePuzzle.config;
      safePuzzle.config = safeConfig;
    }

    // ── GPS: ocultar coordenadas reales, enviar como _targetLat/Lng ──────────
    if (safePuzzle.type === 'gps' && safePuzzle.config) {
      const { lat, lng, hint, radius, encodedText } = safePuzzle.config;
      safePuzzle.config = { encodedText: encodedText || hint || '', radius, _targetLat: lat, _targetLng: lng };
    }

    // ── Trivia: asignar preguntas aleatorias si el modo es random y no hay aún ─
    if (safePuzzle.type === 'trivia') {
      const cfg = safePuzzle.config || {};

      if (cfg.selectionMode === 'random') {
        const countRes = await pool.query(
          'SELECT COUNT(*) FROM game_questions WHERE puzzle_id=$1', [puzzle.id]
        );
        if (parseInt(countRes.rows[0].count) === 0) {
          await assignRandomQuestions(puzzle.id, gameId, cfg);
        }
      }

      // Obtener preguntas asignadas (sin correct_answer)
      const gqRes = await pool.query(
        `SELECT gq.order_index, gq.question_id AS id,
                q.question_text, q.correct_answer, q.wrong_answers
         FROM game_questions gq
         JOIN questions q ON q.id = gq.question_id
         WHERE gq.puzzle_id=$1
         ORDER BY gq.order_index ASC`,
        [puzzle.id]
      );
      const allQuestions = gqRes.rows;

      // Respuestas ya dadas por este equipo
      let existingAnswers = [];
      try {
        if (prog?.submitted_answer) existingAnswers = JSON.parse(prog.submitted_answer);
      } catch {}
      const answeredIds = new Set(existingAnswers.map((a) => a.question_id));

      // Siguiente pregunta sin responder
      const next = allQuestions.find((q) => !answeredIds.has(q.id));

      const triviaState = {
        totalQuestions: allQuestions.length,
        answeredCount:  existingAnswers.length,
        answers:        existingAnswers,
        currentQuestion: next
          ? {
              id:            next.id,
              question_text: next.question_text,
              order_index:   next.order_index,
              // Mezcla de correcta + incorrectas (sin marcar cuál es la correcta)
              options: shuffleArray([next.correct_answer, ...next.wrong_answers]),
            }
          : null,
      };

      // Config segura (sin exponer nada sensible)
      safePuzzle.config = { mode: cfg.mode || 'multiple', questionsPerTeam: cfg.questionsPerTeam || 5 };

      return res.json({
        puzzle: safePuzzle, progress: prog || null,
        totalPuzzles: puzzles.length, currentIndex: puzzle.order_index,
        triviaState,
      });
    }

    return res.json({
      puzzle: safePuzzle, progress: prog || null,
      totalPuzzles: puzzles.length, currentIndex: puzzle.order_index,
    });
  }

  res.json({ puzzle: null, status: 'completed', totalPuzzles: puzzles.length });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

async function assignRandomQuestions(puzzleId, gameId, cfg) {
  const n          = cfg.questionsPerTeam || 5;
  const categoryId = cfg.categoryId  || null;
  const difficulty = cfg.difficulty  || null;

  // $1=puzzleId  $2=gameId  $3=n  (+ opcionales $4, $5 para filtros)
  const params  = [puzzleId, gameId, n];
  const filters = [];
  if (categoryId) { params.push(categoryId); filters.push(`q.category_id = $${params.length}`); }
  if (difficulty) { params.push(difficulty); filters.push(`q.difficulty  = $${params.length}`); }
  const where = filters.length ? `AND ${filters.join(' AND ')}` : '';

  // Excluir preguntas ya usadas en OTROS puzzles del mismo juego
  const { rows: picked } = await pool.query(
    `SELECT q.id
     FROM questions q
     WHERE q.reviewed = true ${where}
       AND q.id NOT IN (
         SELECT question_id FROM game_questions WHERE game_id = $2 AND puzzle_id != $1
       )
     ORDER BY RANDOM()
     LIMIT $3`,
    params
  );

  for (let i = 0; i < picked.length; i++) {
    await pool.query(
      `INSERT INTO game_questions (game_id, puzzle_id, question_id, order_index)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [gameId, puzzleId, picked[i].id, i]
    );
  }
}

module.exports = { listPuzzles, createPuzzle, updatePuzzle, getCurrentPuzzle };
