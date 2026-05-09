import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState('ar');

  useEffect(() => {
    AsyncStorage.getItem('lang').then(l => { if (l) setLang(l); });
  }, []);

  const toggle = async () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    await AsyncStorage.setItem('lang', next);
    setLang(next);
  };

  const isRTL = lang === 'ar';

  return (
    <LangContext.Provider value={{ lang, toggle, isRTL }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
