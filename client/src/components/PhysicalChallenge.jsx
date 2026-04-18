import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

/**
 * Vista del equipo para puzzles de prueba física.
 * Props:
 *   puzzle         — objeto puzzle (sin refereeInstructions)
 *   teamId         — id del equipo
 *   progressStatus — estado actual en team_progress
 *   onRefresh      — callback para recargar el puzzle actual
 */
export default function PhysicalChallenge({ puzzle, teamId, progressStatus, onRefresh }) {
  const [checked,    setChecked]    = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const cfg       = puzzle.config || {};
  const materials = cfg.materials || [];
  const allChecked = materials.length === 0 || materials.every((_, i) => !!checked[i]);

  // Resetear checklist cuando cambia de puzzle
  useEffect(() => {
    setChecked({});
    setError('');
  }, [puzzle.id]);

  async function handleCallReferee() {
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/progress/${teamId}/${puzzle.id}/submit`, { answer: 'PHYSICAL_READY' });
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const canCall = !progressStatus || progressStatus === 'rejected';

  return (
    <div className="space-y-4">
      {/* Descripción de la prueba */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
        <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide mb-2">
          ¿Qué tenéis que hacer?
        </p>
        <p className="text-base text-orange-900 font-medium leading-snug">
          {cfg.description || cfg.encodedText}
        </p>
      </div>

      {/* Checklist de materiales */}
      {materials.length > 0 && (
        <div className="card space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Material necesario</p>
            <p className="text-xs text-gray-400">Marcad cada objeto cuando lo tengáis</p>
          </div>
          {materials.map((mat, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded accent-orange-500"
                checked={!!checked[i]}
                onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                disabled={progressStatus === 'submitted'}
              />
              <span className={`text-sm ${checked[i] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {mat}
              </span>
            </label>
          ))}
          {!allChecked && (
            <p className="text-xs text-orange-500 font-medium">
              {materials.filter((_, i) => !checked[i]).length} objeto(s) pendiente(s)
            </p>
          )}
          {allChecked && (
            <p className="text-xs text-green-600 font-medium">
              ✓ ¡Tenéis todo el material listo!
            </p>
          )}
        </div>
      )}

      {/* Estado de la respuesta */}
      {progressStatus === 'submitted' && (
        <div className="rounded-xl border bg-blue-50 border-blue-200 p-3 flex items-center gap-2 text-blue-700">
          <span className="text-xl">⏳</span>
          <p className="text-sm font-medium">Aviso enviado. El árbitro viene a veros…</p>
        </div>
      )}
      {progressStatus === 'rejected' && (
        <div className="rounded-xl border bg-red-50 border-red-200 p-3 flex items-center gap-2 text-red-700">
          <span className="text-xl">❌</span>
          <p className="text-sm font-medium">La prueba no fue superada. ¡Inténtadlo de nuevo!</p>
        </div>
      )}

      {/* Botón llamar al árbitro */}
      {canCall && (
        <div className="card text-center space-y-2">
          {materials.length > 0 && !allChecked && (
            <p className="text-sm text-gray-400">Marcad todos los materiales antes de llamar al árbitro.</p>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            className="btn-primary w-full text-lg"
            disabled={submitting || (materials.length > 0 && !allChecked)}
            onClick={handleCallReferee}
          >
            {submitting ? 'Enviando…' : '🏁 ¡Listos! Llamar al árbitro'}
          </button>
          <p className="text-xs text-gray-400">
            El árbitro recibirá el aviso y vendrá a supervisar la prueba.
          </p>
        </div>
      )}
    </div>
  );
}
