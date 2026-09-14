'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next, useTranslation } from 'react-i18next';
import { messages } from './messages';
import { contactMessages } from './contact-messages';
import en from '@/content/en.json';
import fr from '@/content/fr.json';
import es from '@/content/es.json';
import type { Locale, PortfolioContent } from '@/content/types';

const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: 'en',
  setLocale: () => {},
});
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [instance] = useState(() => {
    const i = createInstance();
    const resources = {
      en: { ...messages.en, contact: contactMessages.en },
      fr: { ...messages.fr, contact: contactMessages.fr },
      es: { ...messages.es, contact: contactMessages.es },
    };
    void i.use(initReactI18next).init({
      resources,
      lng: 'en',
      fallbackLng: 'en',
      initAsync: false,
      interpolation: { escapeValue: false },
    });
    return i;
  });
  const locale = useSyncExternalStore(
    (callback) => {
      instance.on('languageChanged', callback);
      return () => instance.off('languageChanged', callback);
    },
    () => instance.language as Locale,
    () => 'en' as Locale,
  );
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('matias.locale');
    } catch {}
    const language = navigator.language.split('-')[0];
    const chosen =
      saved === 'fr' || saved === 'en' || saved === 'es'
        ? saved
        : language === 'fr' || language === 'es'
          ? language
          : 'en';
    void instance.changeLanguage(chosen);
    document.documentElement.lang = chosen;
  }, [instance]);
  function setLocale(next: Locale) {
    void instance.changeLanguage(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem('matias.locale', next);
    } catch {}
  }
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <I18nextProvider i18n={instance}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}
export function usePortfolio() {
  const { locale, setLocale } = useContext(LocaleContext);
  const { t } = useTranslation();
  const content: PortfolioContent = locale === 'fr' ? fr : locale === 'es' ? es : en;
  return { locale, setLocale, t, content };
}
