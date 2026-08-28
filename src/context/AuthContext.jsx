import { createContext, useContext, useState, useEffect } from 'react';
import { api, tokenStore } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // The authenticated user object from the API, or null when signed out.
  // Shape: { id, email, role, fullName, avatarUrl }
  const [user, setUser] = useState(null);
  // True while we check for an existing session on first load, so the app
  // doesn't flash the login screen for an already-signed-in user.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      if (!tokenStore.access) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.me();
        if (active) setUser(me);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  };

  const register = async ({ email, password, fullName }) => {
    const u = await api.register({ email, password, fullName });
    setUser(u);
    return u;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  // Kept for backward compatibility: the rest of the app gates on this string.
  const userRole = user?.role ?? 'guest';

  return (
    <AuthContext.Provider value={{ user, userRole, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
