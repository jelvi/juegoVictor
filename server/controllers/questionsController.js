const pool = require('../db/pool');
const { translateQuestions } = require('../services/translateService');

// ─── Categorías ───────────────────────────────────────────────────────────────
async function listCategories(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM question_categories ORDER BY name ASC'
  );
  res.json(rows);
}

async function createCategory(req, res) {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const { rows } = await pool.query(
    `INSERT INTO question_categories (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [name.trim()]
  );
  res.status(201).json(rows[0]);
}

// ─── Preguntas ────────────────────────────────────────────────────────────────
async function listQuestions(req, res) {
  const { category, difficulty, reviewed, search } = req.query;
  const conditions = [];
  const params = [];

  if (category) {
    params.push(Number(category));
    conditions.push(`q.category_id = $${params.length}`);
  }
  if (difficulty) {
    params.push(difficulty);
    conditions.push(`q.difficulty = $${params.length}`);
  }
  if (reviewed !== undefined) {
    params.push(reviewed === 'true');
    conditions.push(`q.reviewed = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`q.question_text ILIKE $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT q.*, c.name AS category_name
     FROM questions q
     LEFT JOIN question_categories c ON c.id = q.category_id
     ${where}
     ORDER BY q.created_at DESC
     LIMIT 200`,
    params
  );
  res.json(rows);
}

async function createQuestion(req, res) {
  const { question_text, correct_answer, wrong_answers, difficulty, category_id } = req.body;
  if (!question_text?.trim() || !correct_answer?.trim()) {
    return res.status(400).json({ error: 'question_text y correct_answer son obligatorios' });
  }

  const { rows } = await pool.query(
    `INSERT INTO questions (question_text, correct_answer, wrong_answers, difficulty, category_id, source, reviewed)
     VALUES ($1, $2, $3, $4, $5, 'admin', true) RETURNING *`,
    [
      question_text.trim(),
      correct_answer.trim(),
      JSON.stringify(wrong_answers || []),
      difficulty || 'medium',
      category_id || null,
    ]
  );
  res.status(201).json(rows[0]);
}

async function updateQuestion(req, res) {
  const { question_text, correct_answer, wrong_answers, difficulty, category_id, reviewed } = req.body;

  const existing = await pool.query('SELECT * FROM questions WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Pregunta no encontrada' });
  const q = existing.rows[0];

  const { rows } = await pool.query(
    `UPDATE questions SET
       question_text  = $1, correct_answer = $2, wrong_answers = $3,
       difficulty     = $4, category_id    = $5, reviewed      = $6
     WHERE id = $7 RETURNING *`,
    [
      question_text  ?? q.question_text,
      correct_answer ?? q.correct_answer,
      JSON.stringify(wrong_answers ?? q.wrong_answers),
      difficulty     ?? q.difficulty,
      category_id    !== undefined ? category_id : q.category_id,
      reviewed       !== undefined ? reviewed    : q.reviewed,
      req.params.id,
    ]
  );
  res.json(rows[0]);
}

async function deleteQuestion(req, res) {
  const { rowCount } = await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Pregunta no encontrada' });
  res.json({ ok: true });
}

// ─── Importar desde OpenTDB ───────────────────────────────────────────────────
async function importQuestions(req, res) {
  const { category, difficulty, amount = 10, categoryName } = req.body;

  // 1. Llamar a OpenTDB
  let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
  if (category) url += `&category=${category}`;
  if (difficulty) url += `&difficulty=${difficulty}`;

  let opentdbData;
  try {
    const response = await fetch(url);
    opentdbData = await response.json();
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo conectar con OpenTDB' });
  }

  if (opentdbData.response_code === 1) {
    return res.status(400).json({ error: 'No hay suficientes preguntas disponibles con esos filtros' });
  }
  if (opentdbData.response_code !== 0) {
    return res.status(502).json({ error: `OpenTDB devolvió código ${opentdbData.response_code}` });
  }

  const raw = opentdbData.results;
  if (!raw?.length) return res.status(400).json({ error: 'OpenTDB no devolvió preguntas' });

  // 2. Traducir con Claude
  const toTranslate = raw.map((q) => ({
    question:       q.question,
    correct_answer: q.correct_answer,
    wrong_answers:  q.incorrect_answers,
  }));

  let translated;
  try {
    translated = await translateQuestions(toTranslate);
  } catch (e) {
    return res.status(502).json({ error: `Error al traducir: ${e.message}` });
  }

  // 3. Encontrar o crear categoría
  let categoryId = null;
  const catName = categoryName || (raw[0]?.category) || 'General';
  const catRes = await pool.query(
    `INSERT INTO question_categories (name)
     VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [catName]
  );
  categoryId = catRes.rows[0].id;

  // 4. Insertar preguntas
  const inserted = [];
  for (const q of translated) {
    if (!q.question_text || !q.correct_answer) continue;
    const { rows } = await pool.query(
      `INSERT INTO questions (question_text, correct_answer, wrong_answers, difficulty, category_id, source, reviewed)
       VALUES ($1, $2, $3, $4, $5, 'imported', false) RETURNING *`,
      [
        q.question_text,
        q.correct_answer,
        JSON.stringify(q.wrong_answers || []),
        difficulty || 'medium',
        categoryId,
      ]
    );
    inserted.push(rows[0]);
  }

  res.status(201).json({ imported: inserted.length, questions: inserted });
}

// ─── Preguntas de un puzzle (admin) ──────────────────────────────────────────
async function getPuzzleQuestions(req, res) {
  const { rows } = await pool.query(
    `SELECT gq.id AS gq_id, gq.order_index, q.*,
            c.name AS category_name
     FROM game_questions gq
     JOIN questions q ON q.id = gq.question_id
     LEFT JOIN question_categories c ON c.id = q.category_id
     WHERE gq.puzzle_id = $1
     ORDER BY gq.order_index ASC`,
    [req.params.id]
  );
  res.json(rows);
}

async function assignQuestion(req, res) {
  const puzzleId = req.params.id;
  const { question_id } = req.body;
  if (!question_id) return res.status(400).json({ error: 'question_id es obligatorio' });

  // Obtener game_id del puzzle
  const pRes = await pool.query('SELECT game_id FROM puzzles WHERE id = $1', [puzzleId]);
  if (!pRes.rows[0]) return res.status(404).json({ error: 'Puzzle no encontrado' });
  const gameId = pRes.rows[0].game_id;

  // Calcular próximo order_index
  const { rows: existing } = await pool.query(
    'SELECT COALESCE(MAX(order_index), -1) AS max FROM game_questions WHERE puzzle_id = $1',
    [puzzleId]
  );
  const nextIdx = existing[0].max + 1;

  const { rows } = await pool.query(
    `INSERT INTO game_questions (game_id, puzzle_id, question_id, order_index)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (puzzle_id, question_id) DO NOTHING
     RETURNING *`,
    [gameId, puzzleId, question_id, nextIdx]
  );
  res.status(201).json(rows[0] || { ok: true, duplicate: true });
}

async function removeQuestion(req, res) {
  const { id: puzzleId, questionId } = req.params;
  const { rowCount } = await pool.query(
    'DELETE FROM game_questions WHERE puzzle_id = $1 AND question_id = $2',
    [puzzleId, questionId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Asignación no encontrada' });
  res.json({ ok: true });
}

module.exports = {
  listCategories, createCategory,
  listQuestions, createQuestion, updateQuestion, deleteQuestion,
  importQuestions,
  getPuzzleQuestions, assignQuestion, removeQuestion,
};
