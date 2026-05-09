import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]       = useState(null);
  const [username, setUsername] = useState('');
  const [role, setRole]         = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('token');
        const u = await AsyncStorage.getItem('username');
        const r = await AsyncStorage.getItem('role');
        if (t) { setToken(t); setUsername(u || ''); setRole(r || ''); }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (t, u, r) => {
    await AsyncStorage.setItem('token',    t);
    await AsyncStorage.setItem('username', u);
    await AsyncStorage.setItem('role',     r);
    setToken(t); setUsername(u); setRole(r);
  };

  const signOut = async () => {
    await AsyncStorage.multiRemove(['token', 'username', 'role']);
    setToken(null); setUsername(''); setRole('');
  };

  return (
    <AuthContext.Provider value={{ token, username, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
