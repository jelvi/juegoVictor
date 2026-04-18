import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage({ auth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAdmin) navigate('/admin');
  }, [auth.isAdmin]);

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await auth.login(username, password);
    if (ok) navigate('/admin');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">🗺️ Yincana</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Usuario</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {auth.error && (
            <p className="text-red-600 text-sm">{auth.error}</p>
          )}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={auth.loading}
          >
            {auth.loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
