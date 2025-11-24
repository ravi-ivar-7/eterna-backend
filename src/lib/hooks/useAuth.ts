import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  userId: number | null;
  isLoading: boolean;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    username: null,
    userId: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    if (token && username && userId) {
      setAuth({
        isAuthenticated: true,
        token,
        username,
        userId: parseInt(userId),
        isLoading: false,
      });
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('userId', data.userId.toString());

      setAuth({
        isAuthenticated: true,
        token: data.token,
        username: data.username,
        userId: data.userId,
        isLoading: false,
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');

    setAuth({
      isAuthenticated: false,
      token: null,
      username: null,
      userId: null,
      isLoading: false,
    });
  };

  return { ...auth, login, logout };
}
