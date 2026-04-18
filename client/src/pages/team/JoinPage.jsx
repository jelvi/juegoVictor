import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [team, setTeam]       = useState(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get(`/teams/join/${token}`)
      .then(setTeam)
      .catch(() => setError('Enlace de invitación no válido.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleJoin(e) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setSaving(true);
    setError('');
    try {
      const member = await api.post(`/teams/${team.id}/members`, { nickname: nickname.trim() });
      // Guardar en sessionStorage para persistir la sesión del equipo
      sessionStorage.setItem('yincana_team_id', team.id);
      sessionStorage.setItem('yincana_team_name', team.name);
      sessionStorage.setItem('yincana_nickname', member.nickname);
      navigate(`/play/${team.id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando…</div>;

  if (error && !team) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center max-w-sm">
          <p className="text-4xl mb-4">😕</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const gameActive = team?.game_status === 'active';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="card w-full max-w-sm text-center space-y-4">
        <div className="text-5xl">🗺️</div>
        <h1 className="text-2xl font-bold">¡Bienvenido/a a la Yincana!</h1>
        <p className="text-gray-600">
          Te unes al equipo <span className="font-bold text-primary-600">{team?.name}</span>
        </p>

        {!gameActive && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
            El juego aún no ha comenzado. Puedes unirte ahora y esperar a que empiece.
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-3 text-left">
          <div>
            <label className="label">¿Cómo te llamas? (apodo)</label>
            <input
              className="input text-lg"
              placeholder="Tu apodo en el juego…"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
              autoFocus
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full text-lg" disabled={saving}>
            {saving ? 'Entrando…' : '¡Entrar al juego! 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
