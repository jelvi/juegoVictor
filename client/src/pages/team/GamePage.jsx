import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HintMaterial from '../../components/HintMaterial';
import { api } from '../../utils/api';
import { usePolling } from '../../hooks/usePolling';

const TYPE_LABELS = {
  cesar:         '🔐 Cifrado César',
  morse:         '📡 Código Morse',
  mirror:        '🪞 Texto Espejo',
  emoji:         '🎭 Emojis',
  number_letter: '🔢 Número-Letra',
};

const STATUS_MESSAGES = {
  submitted: {
    icon:  '⏳',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    text:  'Respuesta enviada. Esperando que el árbitro la revise…',
  },
  rejected: {
    icon:  '❌',
    color: 'bg-red-50 border-red-200 text-red-700',
    text:  '¡Respuesta incorrecta! Inténtalo de nuevo.',
  },
  approved: {
    icon:  '✅',
    color: 'bg-green-50 border-green-200 text-green-700',
    text:  '¡Correcto! Pasando al siguiente puzzle…',
  },
};

export default function GamePage() {
  const { teamId } = useParams();
  const navigate   = useNavigate();

  const teamName = sessionStorage.getItem('yincana_team_name') || 'Tu equipo';
  const nickname = sessionStorage.getItem('yincana_nickname') || '';

  const [current, setCurrent]   = useState(null);   // { puzzle, progress, totalPuzzles, status }
  const [ranking, setRanking]   = useState([]);
  const [answer, setAnswer]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [showRanking, setShowRanking] = useState(false);

  const loadCurrent = useCallback(async () => {
    try {
      const data = await api.get(`/teams/${teamId}/puzzles/current`);
      setCurrent(data);
    } catch {}
  }, [teamId]);

  const loadRanking = useCallback(async () => {
    try {
      // necesitamos game_id — lo tenemos en current una vez cargado
      if (!current?.puzzle) return;
      const gameId = current.puzzle?.game_id;
      if (!gameId) return;
      const r = await api.get(`/games/${gameId}/ranking`);
      setRanking(r);
    } catch {}
  }, [current]);

  useEffect(() => { loadCurrent(); }, [loadCurrent]);
  usePolling(loadCurrent, 4000);
  usePolling(loadRanking, 4000);

  // Limpiar respuesta al cambiar de puzzle
  useEffect(() => {
    setAnswer('');
    setError('');
  }, [current?.puzzle?.id]);

  // Cargar ranking una vez que tenemos game_id
  useEffect(() => { loadRanking(); }, [current?.puzzle?.game_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!answer.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/progress/${teamId}/${current.puzzle.id}/submit`, { answer: answer.trim() });
      await loadCurrent();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Redirección si no hay sesión
  if (!sessionStorage.getItem('yincana_team_id')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center max-w-sm">
          <p className="text-3xl mb-3">😕</p>
          <p>Sesión no encontrada. Usa el enlace de invitación de tu equipo.</p>
        </div>
      </div>
    );
  }

  if (!current) {
    return <div className="min-h-screen flex items-center justify-center">Cargando…</div>;
  }

  // Juego completado
  if (current.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="card text-center max-w-sm space-y-4">
          <div className="text-6xl">🏆</div>
          <h1 className="text-2xl font-bold">¡Habéis completado todos los puzzles!</h1>
          <p className="text-gray-600">Equipo <strong>{teamName}</strong>. ¡Increíble trabajo!</p>
        </div>
      </div>
    );
  }

  // Sin puzzles aún
  if (current.status === 'no_puzzles' || !current.puzzle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center max-w-sm">
          <p className="text-3xl mb-3">⏳</p>
          <p className="text-gray-600">El juego aún no tiene pruebas. ¡Espera a que empiece!</p>
        </div>
      </div>
    );
  }

  const { puzzle, progress } = current;
  const progressStatus = progress?.status;
  const statusInfo = STATUS_MESSAGES[progressStatus];
  const canSubmit = !progressStatus || progressStatus === 'rejected';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-bold">{teamName}</p>
          <p className="text-xs opacity-75">{nickname && `Jugando como ${nickname}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-75">
            {puzzle.order_index + 1} / {current.totalPuzzles}
          </span>
          <button
            className="bg-white/20 hover:bg-white/30 text-sm px-3 py-1 rounded-lg"
            onClick={() => setShowRanking(!showRanking)}
          >
            🏆 Ranking
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Ranking desplegable */}
        {showRanking && ranking.length > 0 && (
          <div className="card">
            <h3 className="font-bold mb-2">Clasificación</h3>
            <ol className="space-y-1">
              {ranking.map((r, i) => (
                <li key={r.id} className={`flex justify-between text-sm py-1 ${r.id === Number(teamId) ? 'font-bold text-primary-600' : ''}`}>
                  <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {r.name}</span>
                  <span className="text-gray-400">{r.approved_count}/{r.total_puzzles}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Puzzle */}
        <div className="card space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              {TYPE_LABELS[puzzle.type] || puzzle.type}
            </p>
            <h2 className="text-xl font-bold mt-1">{puzzle.title}</h2>
            {puzzle.description && (
              <p className="text-gray-600 mt-1">{puzzle.description}</p>
            )}
          </div>

          {/* Texto cifrado */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center">
            <p className="font-mono text-2xl sm:text-3xl font-bold text-amber-800 break-all leading-relaxed">
              {puzzle.config?.encodedText}
            </p>
          </div>

          {/* Material de ayuda */}
          <HintMaterial hint={puzzle.hint_material} />
        </div>

        {/* Estado de la respuesta */}
        {statusInfo && (
          <div className={`rounded-xl border p-3 flex items-center gap-2 ${statusInfo.color}`}>
            <span className="text-xl">{statusInfo.icon}</span>
            <p className="text-sm font-medium">{statusInfo.text}</p>
          </div>
        )}

        {/* Formulario de respuesta */}
        {canSubmit && (
          <form onSubmit={handleSubmit} className="card space-y-3">
            <label className="label font-semibold">Tu respuesta descifrada</label>
            <input
              className="input text-lg"
              placeholder="Escribe la solución…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              autoCapitalize="off"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              className="btn-primary w-full text-lg"
              disabled={submitting || !answer.trim()}
            >
              {submitting ? 'Enviando…' : 'Enviar respuesta 🚀'}
            </button>
          </form>
        )}

        {progressStatus === 'submitted' && (
          <p className="text-center text-xs text-gray-400 animate-pulse">
            Comprobando automáticamente cada 4 segundos…
          </p>
        )}
      </main>
    </div>
  );
}
