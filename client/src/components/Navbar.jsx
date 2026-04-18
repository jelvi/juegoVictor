import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ username, onLogout }) {
  const navigate = useNavigate();

  function handleLogout() {
    onLogout();
    navigate('/admin/login');
  }

  return (
    <header className="bg-primary-500 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/admin" className="font-bold text-xl tracking-tight">
          🗺️ Yincana Admin
        </Link>
        {username && (
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-80">{username}</span>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
