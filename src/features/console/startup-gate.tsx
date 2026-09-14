'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  BriefcaseBusiness,
  FolderOpen,
  Mail,
  Shapes,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '@/i18n/provider';
import { useSound } from '@/features/audio/audio-provider';
import { Mark } from '@/components/mark';
import { RibbonScene } from './ribbon-scene';
import {
  REDUCED_STARTUP_DURATION_MS,
  STARTUP_DURATION_MS,
  STARTUP_WATCHDOG_MS,
  shouldShowStartup,
} from './startup-policy';

type StartupStage = 'boot' | 'menu' | 'reveal';

const icons: readonly LucideIcon[] = [BriefcaseBusiness, FolderOpen, Shapes, Mail];
const subscribeToHydration = () => () => {};

function subscribeToReducedMotion(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function reducedMotionSnapshot(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function waitForImage(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
  if (image.complete) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    signal.addEventListener('abort', finish, { once: true });
  });
}

async function waitForCriticalAssets(timeout: number): Promise<void> {
  const images = Array.from(document.images).filter(
    (image) => image.loading !== 'lazy' || image.dataset.startupCritical !== undefined,
  );
  const fonts = document.fonts?.ready ?? Promise.resolve();
  const controller = new AbortController();
  try {
    await Promise.race([
      Promise.all([fonts, ...images.map((image) => waitForImage(image, controller.signal))]),
      delay(timeout),
    ]);
  } finally {
    controller.abort();
  }
}

export function StartupGate({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const pathname = usePathname();
  const { t } = usePortfolio();
  const { enabled, toggle, play } = useSound();
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );
  const [initialActive] = useState(() =>
    shouldShowStartup({
      pathname: pathname ?? '',
      lifecycle: 'document-load',
      navigationType: 'navigate',
    }),
  );
  const [active, setActive] = useState(initialActive);
  const [decisionReady, setDecisionReady] = useState(initialActive);
  const [stage, setStage] = useState<StartupStage>('boot');
  const playRef = useRef(play);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    const shouldRun = shouldShowStartup({
      pathname: window.location.pathname,
      lifecycle: 'document-load',
      navigationType: navigation?.type === 'reload' ? 'reload' : 'navigate',
    });
    if (!shouldRun) {
      const frame = window.requestAnimationFrame(() => setDecisionReady(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const frame = window.requestAnimationFrame(() => {
      if (!initialActive) setActive(true);
      setDecisionReady(true);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      let cancelled = false;
      let restored = false;
      const timers: number[] = [];
      const started = performance.now();
      const duration = reduced ? REDUCED_STARTUP_DURATION_MS : STARTUP_DURATION_MS;

      const restoreOverflow = () => {
        if (restored) return;
        restored = true;
        document.body.style.overflow = originalOverflow;
      };

      if (!reduced) playRef.current('boot');

      const finish = () => {
        if (cancelled) return;
        restoreOverflow();
        setStage('reveal');
        setActive(false);
      };
      const schedule = (callback: () => void, milliseconds: number) => {
        const timer = window.setTimeout(callback, milliseconds);
        timers.push(timer);
      };

      if (!reduced) {
        schedule(() => setStage('menu'), 900);
        schedule(() => setStage('reveal'), duration - 600);
      }

      const complete = async () => {
        if (!reduced) await waitForCriticalAssets(STARTUP_WATCHDOG_MS);
        const remaining = Math.max(0, duration - (performance.now() - started));
        if (remaining > 0) await delay(remaining);
        finish();
      };
      void complete();

      const cleanup = () => {
        cancelled = true;
        timers.forEach((timer) => window.clearTimeout(timer));
        restoreOverflow();
      };
      cleanupRef.current = cleanup;
    });
    return () => {
      window.cancelAnimationFrame(frame);
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [initialActive]);

  return (
    <>
      <noscript>
        <style>{'.startup-overlay { display: none !important; }'}</style>
      </noscript>
      <div
        className="startup-overlay"
        data-active={active ? 'true' : 'false'}
        data-stage={stage}
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
        data-startup-pending={decisionReady ? 'false' : 'true'}
        role="status"
        aria-label={t('introLabel')}
        aria-hidden={!active}
        ref={(node) => {
          node?.toggleAttribute('inert', !active);
        }}
      >
        <RibbonScene active={active && !reducedMotion} />
        <div className="startup-center">
          <Mark />
          <span>Matias Suxo</span>
          <span className="startup-icons" aria-hidden="true">
            {icons.map((Icon, index) => (
              <Icon key={index} />
            ))}
          </span>
        </div>
        <button
          className="startup-mute"
          type="button"
          tabIndex={active ? 0 : -1}
          aria-label={enabled ? t('soundOff') : t('soundOn')}
          aria-pressed={enabled}
          onClick={toggle}
        >
          {enabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        </button>
      </div>
      <div
        ref={(node) => {
          node?.toggleAttribute('inert', active || !decisionReady);
        }}
        data-startup-pending={decisionReady ? 'false' : 'true'}
        aria-hidden={hydrated && (active || !decisionReady)}
      >
        {children}
      </div>
    </>
  );
}
