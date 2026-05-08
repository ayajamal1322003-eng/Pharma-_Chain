import React, { createContext, useContext, useState } from 'react';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import translations from '../i18n/translations';

const LanguageContext = createContext(null);

const LANG_KEY = 'pharmachain_lang';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('ar'); // default Arabic

  // Restore saved language on mount (sync is fine since we start with 'ar')
  React.useEffect(() => {
    SecureStore.getItemAsync(LANG_KEY).then((saved) => {
      if (saved && (saved === 'ar' || saved === 'en')) {
        setLangState(saved);
      }
    });
  }, []);

  const isRTL = lang === 'ar';

  // Translate a key; falls back to the key itself if missing
  const t = (key) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] ?? entry.en ?? key;
  };

  const switchLanguage = async () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLangState(next);
    await SecureStore.setItemAsync(LANG_KEY, next);
    // RTL hint for future restarts — styles respond to isRTL instead
    I18nManager.forceRTL(next === 'ar');
  };

  return (
    <LanguageContext.Provider value={{ lang, isRTL, t, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
};
