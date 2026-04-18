import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import PuzzleForm from './PuzzleForm';
import PuzzlePreview from './PuzzlePreview';
import { api } from '../../utils/api';

const STATUS_TRANSITIONS = {
  draft:    ['active'],
  active:   ['finished', 'draft'],
  finished: ['draft'],
};

export default function GameEditorPage({ auth }) {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [puzzles, setPuzzles] = useState([]);
  const [tab, setTab] = useState('equipos');

  // Team form
  const [teamName, setTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [editTeamName, setEditTeamName] = useState('');

  // Puzzle form
  const [showPuzzleForm, setShowPuzzleForm] = useState(false);
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [previewPuzzle, setPreviewPuzzle] = useState(null);

  const [error, setError] = useState('');

  async function load() {
    const [g, t, p] = await Promise.all([
      api.get(`/games/${id}`),
      api.get(`/games/${id}/teams`),
      api.get(`/games/${id}/puzzles`),
    ]);
    setGame(g);
    setTeams(t);
    setPuzzles(p);
  }

  useEffect(() => { load(); }, [id]);

  async function handleStatusChange(newStatus) {
    try {
      const g = await api.patch(`/games/${id}/status`, { status: newStatus });
      setGame(g);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!teamName.trim()) return;
    try {
      await api.post(`/games/${id}/teams`, { name: teamName.trim() });
      setTeamName('');
      const t = await api.get(`/games/${id}/teams`);
      setTeams(t);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleUpdateTeam(e) {
    e.preventDefault();
    try {
      await api.patch(`/teams/${editingTeam.id}`, { name: editTeamName });
      setEditingTeam(null);
      const t = await api.get(`/games/${id}/teams`);
      setTeams(t);
    } catch (e) {
      setError(e.message);
    }
  }

  function inviteLink(token) {
    return `${window.location.origin}/join/${token}`;
  }

  function copyLink(token) {
    navigator.clipboard.writeText(inviteLink(token));
  }

  async function handlePuzzleSaved() {
    const p = await api.get(`/games/${id}/puzzles`);
    setPuzzles(p);
    setShowPuzzleForm(false);
    setEditingPuzzle(null);
  }

  if (!game) return <div className="p-8 text-center">Cargando…</div>;

  const nextStatuses = STATUS_TRANSITIONS[game.status] || [];

  return (
    <div className="min-h-screen">
      <Navbar username={auth.username} onLogout={auth.logout} />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Cabecera juego */}
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{game.name}</h2>
            <StatusBadge status={game.status} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={s === 'active' ? 'btn-success' : s === 'finished' ? 'btn-danger' : 'btn-secondary'}
              >
                {s === 'active' ? '▶ Activar' : s === 'finished' ? '■ Finalizar' : '⏪ Volver a borrador'}
              </button>
            ))}
            <Link to={`/admin/games/${id}/live`} className="btn-primary">
              Panel en vivo
            </Link>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-amber-200">
          {['equipos', 'puzzles'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-medium capitalize text-sm rounded-t-lg transition-colors
                ${tab === t ? 'bg-white border border-b-white border-amber-200 -mb-px text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'equipos' ? `Equipos (${teams.length})` : `Puzzles (${puzzles.length})`}
            </button>
          ))}
        </div>

        {/* Equipos */}
        {tab === 'equipos' && (
          <div className="space-y-3">
            <form onSubmit={handleCreateTeam} className="card flex gap-2">
              <input
                className="input flex-1"
                placeholder="Nombre del equipo…"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <button className="btn-primary">Añadir</button>
            </form>

            {teams.map((team) => (
              <div key={team.id} className="card space-y-2">
                {editingTeam?.id === team.id ? (
                  <form onSubmit={handleUpdateTeam} className="flex gap-2">
                    <input
                      className="input flex-1"
                      value={editTeamName}
                      onChange={(e) => setEditTeamName(e.target.value)}
                    />
                    <button className="btn-primary text-sm">Guardar</button>
                    <button type="button" className="btn-secondary text-sm" onClick={() => setEditingTeam(null)}>Cancelar</button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{team.name}</span>
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => { setEditingTeam(team); setEditTeamName(team.name); }}
                    >
                      Editar
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <input
                    readOnly
                    value={inviteLink(team.invite_token)}
                    className="input flex-1 text-xs text-gray-500"
                  />
                  <button
                    className="btn-secondary text-xs whitespace-nowrap"
                    onClick={() => copyLink(team.invite_token)}
                  >
                    Copiar enlace
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Puzzles */}
        {tab === 'puzzles' && (
          <div className="space-y-3">
            {!showPuzzleForm && !editingPuzzle && (
              <button className="btn-primary" onClick={() => setShowPuzzleForm(true)}>
                + Añadir puzzle
              </button>
            )}

            {(showPuzzleForm || editingPuzzle) && (
              <div className="card">
                <h3 className="font-bold mb-3">{editingPuzzle ? 'Editar puzzle' : 'Nuevo puzzle'}</h3>
                <PuzzleForm
                  gameId={id}
                  puzzle={editingPuzzle}
                  onSaved={handlePuzzleSaved}
                  onCancel={() => { setShowPuzzleForm(false); setEditingPuzzle(null); }}
                />
              </div>
            )}

            {puzzles.map((p) => (
              <div key={p.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-gray-400 mr-2">#{p.order_index + 1}</span>
                    <span className="font-semibold">{p.title}</span>
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{p.type}</span>
                    {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Texto: {p.config?.encodedText}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => setPreviewPuzzle(previewPuzzle?.id === p.id ? null : p)}
                    >
                      {previewPuzzle?.id === p.id ? 'Ocultar' : 'Vista previa'}
                    </button>
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => { setEditingPuzzle(p); setShowPuzzleForm(false); }}
                    >
                      Editar
                    </button>
                  </div>
                </div>
                {previewPuzzle?.id === p.id && (
                  <div className="mt-4 border-t border-amber-100 pt-4">
                    <PuzzlePreview puzzle={p} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
