import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../utils/api';

export default function DashboardPage({ auth }) {
  const [games, setGames] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function load() {
    try {
      const data = await api.get('/games');
      setGames(data);
    } catch (e) {
      if (e.message.includes('autorizado')) auth.logout();
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const game = await api.post('/games', { name: newName.trim() });
      navigate(`/admin/games/${game.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar username={auth.username} onLogout={auth.logout} />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-bold">Mis juegos</h2>

        {/* Crear juego */}
        <div className="card">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Nombre del nuevo juego…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="btn-primary" disabled={creating}>
              {creating ? '…' : 'Crear'}
            </button>
          </form>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>

        {/* Lista de juegos */}
        {games.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay juegos aún.</p>
        ) : (
          <div className="space-y-3">
            {games.map((g) => (
              <div key={g.id} className="card flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(g.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={g.status} />
                  <Link to={`/admin/games/${g.id}`} className="btn-secondary text-sm">
                    Editar
                  </Link>
                  <Link to={`/admin/games/${g.id}/live`} className="btn-primary text-sm">
                    En vivo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
