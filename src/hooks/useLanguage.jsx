import { useEffect, useMemo, useState } from 'react';
import { languages, translations } from '@/lib/translations';

const STORAGE_KEY = 'playitas-language';
const EVENT_NAME = 'playitas-language-change';

export const getStoredLanguage = () => {
  if (typeof window === 'undefined') return 'es';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return languages.some((item) => item.value === stored) ? stored : 'es';
};

const getNestedValue = (object, path) => path.split('.').reduce((acc, key) => acc?.[key], object);

export function useLanguage() {
  const [language, setLanguageState] = useState(getStoredLanguage);

  useEffect(() => {
    const syncLanguage = () => setLanguageState(getStoredLanguage());
    window.addEventListener('storage', syncLanguage);
    window.addEventListener(EVENT_NAME, syncLanguage);
    return () => {
      window.removeEventListener('storage', syncLanguage);
      window.removeEventListener(EVENT_NAME, syncLanguage);
    };
  }, []);

  const setLanguage = (value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  const dictionary = useMemo(() => translations[language] || translations.es, [language]);

  const t = (path) => getNestedValue(dictionary, path) ?? getNestedValue(translations.es, path) ?? path;

  return {
    language,
    setLanguage,
    t,
    dictionary,
    languages,
  };
}