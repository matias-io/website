'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeProvider, useTheme } from 'next-themes';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Moon, Sun, Volume2, VolumeX, MessageCircle } from 'lucide-react';
import { usePortfolio, LanguageProvider } from '@/i18n/provider';
import { SoundProvider, useSound } from '@/features/audio/audio-provider';
import { Overview } from './overview';
import { Mark } from '@/components/mark';
import { BootSequence } from '@/features/console/console';
import { AssistantDrawer } from '@/features/assistant/assistant-drawer';
import type { Locale } from '@/content/types';

const subscribeToHydration = () => () => {};

function decodeHash(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function PortfolioProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <LanguageProvider>
        <SoundProvider>
          <PortfolioShell>{children}</PortfolioShell>
        </SoundProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
function PortfolioShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const compact = path !== '/';
  const { t, locale, setLocale } = usePortfolio();
  const { enabled, toggle, play } = useSound();
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const themeReady = hydrated && resolvedTheme !== undefined;
  const dark = themeReady && resolvedTheme === 'dark';
  const [chatOpen, setChatOpen] = useState(false);
  const pane = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const element = pane.current;
    let cleanupHighlight: ReturnType<typeof setTimeout> | undefined;
    function focusContent() {
      const hash = decodeHash(window.location.hash.slice(1));
      const anchor = hash ? document.getElementById(hash) : null;
      if (anchor) {
        anchor.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
        if (!anchor.hasAttribute('tabindex')) anchor.tabIndex = -1;
        anchor.focus({ preventScroll: true });
        anchor.classList.add('citation-highlight');
        cleanupHighlight = setTimeout(() => anchor.classList.remove('citation-highlight'), 1600);
      } else {
        element?.scrollTo({ top: 0 });
        if (!compact || matchMedia('(max-width: 760px)').matches)
          window.scrollTo({ top: 0, behavior: 'instant' });
        element?.querySelector<HTMLElement>('.detail-title')?.focus({ preventScroll: true });
      }
    }
    const frame = requestAnimationFrame(focusContent);
    window.addEventListener('hashchange', focusContent);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(cleanupHighlight);
      window.removeEventListener('hashchange', focusContent);
    };
  }, [path, compact, reduced]);
  function theme() {
    if (!themeReady) return;
    setTheme(dark ? 'light' : 'dark');
    play('select');
  }
  return (
    <>
      <a
        className="skip-link"
        href={compact ? '#detail-content' : '#portfolio-overview'}
        onClick={() => {
          const target = document.getElementById(compact ? 'detail-content' : 'portfolio-overview');
          target?.focus({ preventScroll: true });
        }}
      >
        {t('skipContent')}
      </a>
      <header className="site-header">
        <Link href="/" aria-label="Matias Suxo" scroll={false} className="brand">
          <Mark />
          <span>Matias Suxo</span>
        </Link>
        <div className="site-settings">
          <select
            aria-label={t('language')}
            value={locale}
            onChange={(event) => {
              setLocale(event.target.value as Locale);
              play('select');
            }}
          >
            <option value="en">EN</option>
            <option value="fr">FR</option>
            <option value="es">ES</option>
          </select>
          <button
            onClick={theme}
            disabled={!themeReady}
            aria-label={themeReady ? (dark ? t('light') : t('dark')) : t('dark')}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            className="sound-toggle"
            onClick={toggle}
            aria-label={t('soundLabel')}
            aria-pressed={enabled}
          >
            {enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            <span>{enabled ? t('soundOn') : t('soundOff')}</span>
          </button>
        </div>
      </header>
      <main className={`workspace ${compact ? 'detail-open' : ''}`}>
        <div id="portfolio-overview" className="overview-scroll" tabIndex={-1}>
          <Overview compact={compact} />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {compact && (
            <motion.div
              className="detail-panel"
              key="detail-panel"
              initial={{ opacity: 0, x: reduced ? 0 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduced ? 0 : 16 }}
              transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="detail-toolbar">
                <Link href="/" scroll={false} onClick={() => play('close')}>
                  <ArrowLeft size={16} />
                  {t('back')}
                </Link>
                <span>
                  {path.startsWith('/experience')
                    ? t('experience')
                    : path.startsWith('/projects')
                      ? t('projects')
                      : path.startsWith('/skills')
                        ? t('skills')
                        : t('contact')}
                </span>
              </div>
              <div className="detail-scroll" id="detail-content" ref={pane} tabIndex={-1}>
                <motion.div
                  key={path}
                  initial={{ opacity: 0, y: reduced ? 0 : 9 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.23 }}
                >
                  {children}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <footer className="site-footer">
        <BootSequence />
        <button
          className="assistant-launcher"
          onClick={() => {
            setChatOpen(true);
            play('open');
          }}
          aria-expanded={chatOpen}
          aria-controls="assistant-dialog"
        >
          <MessageCircle size={17} />
          {t('ask')}
          <span className="ai-label">AI</span>
        </button>
      </footer>
      <AssistantDrawer
        open={chatOpen}
        onClose={() => {
          setChatOpen(false);
          play('close');
        }}
      />
    </>
  );
}
