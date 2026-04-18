import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('yincana_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('yincana_username'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (user, pass) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', { username: user, password: pass });
      localStorage.setItem('yincana_token', data.token);
      localStorage.setItem('yincana_username', data.username);
      setToken(data.token);
      setUsername(data.username);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('yincana_token');
    localStorage.removeItem('yincana_username');
    setToken(null);
    setUsername(null);
  }, []);

  return { token, username, login, logout, error, loading, isAdmin: !!token };
}
