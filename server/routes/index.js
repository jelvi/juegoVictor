const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const auth = require('../controllers/authController');
const games = require('../controllers/gamesController');
const teams = require('../controllers/teamsController');
const puzzles = require('../controllers/puzzlesController');
const progress = require('../controllers/progressController');

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', auth.login);

// ── Games ─────────────────────────────────────────────────────────────────────
router.get('/games', requireAuth, games.listGames);
router.post('/games', requireAuth, games.createGame);
router.get('/games/:id', requireAuth, games.getGame);
router.patch('/games/:id/status', requireAuth, games.updateGameStatus);

// ── Teams ─────────────────────────────────────────────────────────────────────
router.get('/games/:id/teams', requireAuth, teams.listTeams);
router.post('/games/:id/teams', requireAuth, teams.createTeam);
router.patch('/teams/:id', requireAuth, teams.updateTeam);
// Acceso público por invite_token
router.get('/teams/join/:token', teams.joinByToken);
router.post('/teams/:id/members', teams.addMember);

// ── Puzzles ───────────────────────────────────────────────────────────────────
router.get('/games/:id/puzzles', requireAuth, puzzles.listPuzzles);
router.post('/games/:id/puzzles', requireAuth, puzzles.createPuzzle);
router.patch('/puzzles/:id', requireAuth, puzzles.updatePuzzle);
// Para el equipo (público con token implícito en el team_id)
router.get('/teams/:id/puzzles/current', puzzles.getCurrentPuzzle);

// ── Progress ──────────────────────────────────────────────────────────────────
router.post('/progress/:teamId/:puzzleId/gps-checkin', progress.gpsCheckin);
router.post('/progress/:teamId/:puzzleId/submit', progress.submitAnswer);
router.patch('/progress/:id/review', requireAuth, progress.reviewAnswer);
router.get('/games/:id/progress', requireAuth, progress.getGameProgress);
router.get('/games/:id/ranking', progress.getRanking); // público (para equipos también)

module.exports = router;
