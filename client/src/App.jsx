import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Admin
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import GameEditorPage from './pages/admin/GameEditorPage';
import LiveControlPage from './pages/admin/LiveControlPage';

// Equipo
import JoinPage from './pages/team/JoinPage';
import GamePage from './pages/team/GamePage';

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  const auth = useAuth();

  return (
    <Routes>
      {/* Admin */}
      <Route path="/admin/login" element={<LoginPage auth={auth} />} />
      <Route path="/admin" element={<AdminRoute><DashboardPage auth={auth} /></AdminRoute>} />
      <Route path="/admin/games/:id" element={<AdminRoute><GameEditorPage auth={auth} /></AdminRoute>} />
      <Route path="/admin/games/:id/live" element={<AdminRoute><LiveControlPage auth={auth} /></AdminRoute>} />

      {/* Equipo */}
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="/play/:teamId" element={<GamePage />} />

      {/* Raíz */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<div className="p-8 text-center text-gray-500">Página no encontrada</div>} />
    </Routes>
  );
}
