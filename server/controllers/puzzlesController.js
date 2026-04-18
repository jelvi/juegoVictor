const pool = require('../db/pool');
const loadCiphers = require('../lib/ciphers');

// ── Helpers ───────────────────────────────────────────────────────────────────
async function ciphers() {
  return loadCiphers();
}

// ── Handlers ──────────────────────────────────────────────────────────────────
async function listPuzzles(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM puzzles WHERE game_id = $1 ORDER BY order_index ASC',
    [req.params.id]
  );
  res.json(rows);
}

async function createPuzzle(req, res) {
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
  const encodedText = encode(type, solution, cfg);
  const fullConfig = { ...cfg, encodedText };

  const { rows } = await pool.query(
    `INSERT INTO puzzles (game_id, order_index, title, description, type, config, solution, hint_material)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      req.params.id,
      order_index ?? 0,
      title,
      description || '',
      type,
      JSON.stringify(fullConfig),
      solution,
      JSON.stringify(hintMaterial),
    ]
  );
  res.status(201).json(rows[0]);
}

async function updatePuzzle(req, res) {
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
    `UPDATE puzzles SET
       title = $1, description = $2, type = $3, config = $4,
       solution = $5, hint_material = $6, order_index = $7
     WHERE id = $8 RETURNING *`,
    [
      title         ?? puzzle.title,
      description   ?? puzzle.description,
      newType,
      JSON.stringify(fullConfig),
      newSolution,
      JSON.stringify(hintMaterial),
      order_index   ?? puzzle.order_index,
      req.params.id,
    ]
  );
  res.json(rows[0]);
}

async function getCurrentPuzzle(req, res) {
  const teamId = req.params.id;

  const teamRes = await pool.query('SELECT game_id FROM teams WHERE id = $1', [teamId]);
  if (!teamRes.rows[0]) return res.status(404).json({ error: 'Equipo no encontrado' });
  const gameId = teamRes.rows[0].game_id;

  const puzzlesRes = await pool.query(
    'SELECT * FROM puzzles WHERE game_id = $1 ORDER BY order_index ASC',
    [gameId]
  );
  const puzzles = puzzlesRes.rows;

  if (puzzles.length === 0) return res.json({ puzzle: null, status: 'no_puzzles' });

  const progressRes = await pool.query(
    'SELECT * FROM team_progress WHERE team_id = $1',
    [teamId]
  );
  const progressMap = {};
  for (const p of progressRes.rows) progressMap[p.puzzle_id] = p;

  for (const puzzle of puzzles) {
    const prog = progressMap[puzzle.id];
    if (!prog || prog.status !== 'approved') {
      const { solution, ...safePuzzle } = puzzle;

      // GPS: las coordenadas del destino se envían con prefijo _ para la brújula
      // pero no se muestran en la UI (solo las usa GpsCompass internamente).
      // La solución ("GPS_LOCATION") ya quedó excluida arriba.
      if (safePuzzle.type === 'gps' && safePuzzle.config) {
        const { lat, lng, hint, radius, encodedText } = safePuzzle.config;
        safePuzzle.config = {
          encodedText: encodedText || hint || '',
          radius,
          // prefijo _ para indicar "solo para la brújula, no mostrar al usuario"
          _targetLat: lat,
          _targetLng: lng,
        };
      }

      return res.json({
        puzzle: safePuzzle,
        progress: prog || null,
        totalPuzzles: puzzles.length,
        currentIndex: puzzle.order_index,
      });
    }
  }

  res.json({ puzzle: null, status: 'completed', totalPuzzles: puzzles.length });
}

module.exports = { listPuzzles, createPuzzle, updatePuzzle, getCurrentPuzzle };
