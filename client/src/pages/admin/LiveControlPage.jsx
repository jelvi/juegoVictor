import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../utils/api';
import { usePolling } from '../../hooks/usePolling';

export default function LiveControlPage({ auth }) {
  const { id } = useParams();
  const [game, setGame]       = useState(null);
  const [progress, setProgress] = useState([]);
  const [ranking, setRanking]   = useState([]);
  const [tab, setTab] = useState('revisiones');
  const [reviewing, setReviewing] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [g, prog, rank] = await Promise.all([
        api.get(`/games/${id}`),
        api.get(`/games/${id}/progress`),
        api.get(`/games/${id}/ranking`),
      ]);
      setGame(g);
      setProgress(prog);
      setRanking(rank);
    } catch {}
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);
  usePolling(loadData, 4000);

  async function handleReview(progressId, action) {
    setReviewing((r) => ({ ...r, [progressId]: true }));
    try {
      await api.patch(`/progress/${progressId}/review`, { action });
      await loadData();
    } catch (e) {
      alert(e.message);
    } finally {
      setReviewing((r) => ({ ...r, [progressId]: false }));
    }
  }

  const pendingReview = progress.filter((p) => p.status === 'submitted');

  if (!game) return <div className="p-8 text-center">Cargando…</div>;

  return (
    <div className="min-h-screen">
      <Navbar username={auth.username} onLogout={auth.logout} />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold">{game.name}</h2>
            <StatusBadge status={game.status} />
          </div>
          <Link to={`/admin/games/${id}`} className="btn-secondary text-sm ml-auto">
            ← Editor
          </Link>
          <span className="text-xs text-gray-400 animate-pulse">● actualizando cada 4s</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-amber-200">
          {['revisiones', 'ranking', 'detalle'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-medium capitalize text-sm rounded-t-lg transition-colors
                ${tab === t ? 'bg-white border border-b-white border-amber-200 -mb-px text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'revisiones'
                ? `Revisiones${pendingReview.length > 0 ? ` (${pendingReview.length})` : ''}`
                : t === 'ranking' ? 'Ranking' : 'Detalle completo'}
            </button>
          ))}
        </div>

        {/* Revisiones */}
        {tab === 'revisiones' && (
          <div className="space-y-3">
            {pendingReview.length === 0 && (
              <p className="text-gray-400 text-center py-8">No hay respuestas pendientes de revisión.</p>
            )}
            {pendingReview.map((p) => {
              // Detectar tipo de respuesta
              let gpsData      = null;
              let isPhysical   = false;
              try {
                const parsed = JSON.parse(p.submitted_answer);
                if (parsed?.type === 'gps_checkin') gpsData = parsed;
              } catch {}
              if (p.submitted_answer === 'PHYSICAL_READY' || p.puzzle_type === 'physical') {
                isPhysical = true;
              }

              const borderClass = gpsData ? 'border-blue-200' : isPhysical ? 'border-orange-200' : '';

              return (
                <div key={p.id} className={`card ${borderClass}`}>
                  <div className="flex flex-wrap gap-2 justify-between items-start">
                    <div>
                      <span className="font-semibold">{p.team_name}</span>
                      <span className="text-gray-400 text-sm ml-2">→ {p.puzzle_title}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      {gpsData && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          📍 GPS
                        </span>
                      )}
                      {isPhysical && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          🏃 Prueba física
                        </span>
                      )}
                      <StatusBadge status={p.status} />
                    </div>
                  </div>

                  {gpsData ? (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <p className="text-sm font-semibold text-blue-800">
                        ¡El equipo ha llegado al punto!
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Distancia al llegar: <strong>{gpsData.distance} m</strong>
                        {' · '}
                        Coords: {gpsData.lat}, {gpsData.lng}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {p.submitted_at ? new Date(p.submitted_at).toLocaleTimeString('es-ES') : ''}
                      </p>
                    </div>
                  ) : isPhysical ? (
                    <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 space-y-2">
                      <p className="text-sm font-semibold text-orange-800">
                        ¡El equipo está listo para ejecutar la prueba!
                      </p>
                      {p.puzzle_config?.refereeInstructions && (
                        <div className="bg-white border border-orange-200 rounded-lg px-3 py-2">
                          <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide mb-1">
                            Instrucciones para ti (árbitro)
                          </p>
                          <p className="text-sm text-gray-700">{p.puzzle_config.refereeInstructions}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-400">
                        Aviso enviado: {p.submitted_at ? new Date(p.submitted_at).toLocaleTimeString('es-ES') : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 bg-amber-50 rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-500 mb-1">Respuesta enviada:</p>
                      <p className="font-mono font-bold text-lg">{p.submitted_answer}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {p.submitted_at ? new Date(p.submitted_at).toLocaleTimeString('es-ES') : ''}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      className="btn-success"
                      disabled={reviewing[p.id]}
                      onClick={() => handleReview(p.id, 'approve')}
                    >
                      ✓ {isPhysical ? 'Prueba superada' : 'Aprobar'}
                    </button>
                    <button
                      className="btn-danger"
                      disabled={reviewing[p.id]}
                      onClick={() => handleReview(p.id, 'reject')}
                    >
                      ✗ {isPhysical ? 'No superada' : 'Rechazar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ranking */}
        {tab === 'ranking' && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Equipo</th>
                  <th className="text-center py-2 px-3">Puzzles completados</th>
                  <th className="text-left py-2 px-3">Última aprobación</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.id} className="border-b border-amber-50 even:bg-amber-50">
                    <td className="py-2 px-3 font-bold text-primary-500">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold">{r.name}</td>
                    <td className="py-2 px-3 text-center">
                      {r.approved_count} / {r.total_puzzles}
                    </td>
                    <td className="py-2 px-3 text-gray-400 text-xs">
                      {r.last_approval
                        ? new Date(r.last_approval).toLocaleTimeString('es-ES')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detalle completo */}
        {tab === 'detalle' && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100">
                  <th className="text-left py-2 px-2">Equipo</th>
                  <th className="text-left py-2 px-2">Puzzle</th>
                  <th className="text-left py-2 px-2">Estado</th>
                  <th className="text-left py-2 px-2">Respuesta</th>
                  <th className="text-left py-2 px-2">Enviado</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((p) => (
                  <tr key={p.id} className="border-b border-amber-50 even:bg-amber-50">
                    <td className="py-1.5 px-2 font-medium">{p.team_name}</td>
                    <td className="py-1.5 px-2">#{p.order_index + 1} {p.puzzle_title}</td>
                    <td className="py-1.5 px-2"><StatusBadge status={p.status} /></td>
                    <td className="py-1.5 px-2 font-mono text-xs">{p.submitted_answer || '—'}</td>
                    <td className="py-1.5 px-2 text-xs text-gray-400">
                      {p.submitted_at ? new Date(p.submitted_at).toLocaleTimeString('es-ES') : '—'}
                    </td>
                  </tr>
                ))}
                {progress.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">Sin actividad aún.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
