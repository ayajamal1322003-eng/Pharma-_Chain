import React, { createContext, useContext, useState, useEffect } from 'react';
import { authLogin, saveToken, getToken, deleteToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // { username, role, token }
  const [loading, setLoading] = useState(true);   // initial token check

  // On mount: restore session from SecureStore
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          // Decode payload from JWT (base64 middle section)
          const payload = JSON.parse(
            atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
          );
          const role     = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
                        || payload.role || '';
          const username = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
                        || payload.name || '';
          const exp      = payload.exp || 0;

          if (Date.now() / 1000 < exp) {
            setUser({ username, role, token });
          } else {
            await deleteToken();
          }
        }
      } catch (_) {
        await deleteToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (username, password) => {
    const res = await authLogin({ username, password });
    const { token } = res.data;
    await saveToken(token);

    const payload  = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
              || payload.role || '';
    setUser({ username, role, token });
    return { username, role, token };
  };

  const logout = async () => {
    await deleteToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
