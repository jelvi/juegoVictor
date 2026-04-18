const express = require('express');
const router  = express.Router();

const { requireAuth } = require('../middleware/auth');
const auth      = require('../controllers/authController');
const games     = require('../controllers/gamesController');
const teams     = require('../controllers/teamsController');
const puzzles   = require('../controllers/puzzlesController');
const progress  = require('../controllers/progressController');
const questions = require('../controllers/questionsController');

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', auth.login);

// ── Games ─────────────────────────────────────────────────────────────────────
router.get('/games',            requireAuth, games.listGames);
router.post('/games',           requireAuth, games.createGame);
router.get('/games/:id',        requireAuth, games.getGame);
router.patch('/games/:id/status', requireAuth, games.updateGameStatus);

// ── Teams ─────────────────────────────────────────────────────────────────────
router.get('/games/:id/teams',  requireAuth, teams.listTeams);
router.post('/games/:id/teams', requireAuth, teams.createTeam);
router.patch('/teams/:id',      requireAuth, teams.updateTeam);
router.get('/teams/join/:token',             teams.joinByToken);
router.post('/teams/:id/members',            teams.addMember);

// ── Puzzles ───────────────────────────────────────────────────────────────────
router.get('/games/:id/puzzles',   requireAuth, puzzles.listPuzzles);
router.post('/games/:id/puzzles',  requireAuth, puzzles.createPuzzle);
router.patch('/puzzles/:id',       requireAuth, puzzles.updatePuzzle);
router.get('/teams/:id/puzzles/current',     puzzles.getCurrentPuzzle);

// ── Puzzle questions (trivia) ─────────────────────────────────────────────────
router.get('/puzzles/:id/questions',              requireAuth, questions.getPuzzleQuestions);
router.post('/puzzles/:id/questions',             requireAuth, questions.assignQuestion);
router.delete('/puzzles/:id/questions/:questionId', requireAuth, questions.removeQuestion);

// ── Questions pool ────────────────────────────────────────────────────────────
// OJO: rutas estáticas ANTES de /:id
router.get('/questions/categories',  requireAuth, questions.listCategories);
router.post('/questions/categories', requireAuth, questions.createCategory);
router.post('/questions/import',     requireAuth, questions.importQuestions);
router.get('/questions',             requireAuth, questions.listQuestions);
router.post('/questions',            requireAuth, questions.createQuestion);
router.patch('/questions/:id',       requireAuth, questions.updateQuestion);
router.delete('/questions/:id',      requireAuth, questions.deleteQuestion);

// ── Progress ──────────────────────────────────────────────────────────────────
router.post('/progress/:teamId/:puzzleId/gps-checkin',   progress.gpsCheckin);
router.post('/progress/:teamId/:puzzleId/trivia-answer', progress.triviaAnswer);
router.post('/progress/:teamId/:puzzleId/submit',        progress.submitAnswer);
router.patch('/progress/:id/review',   requireAuth, progress.reviewAnswer);
router.get('/games/:id/progress',      requireAuth, progress.getGameProgress);
router.get('/games/:id/ranking',                    progress.getRanking);

module.exports = router;
