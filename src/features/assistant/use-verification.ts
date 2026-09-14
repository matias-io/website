'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTurnstile } from './turnstile';

export function useVerification(siteKey: string | null, action: string) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const container = useCallback((node: HTMLDivElement | null) => setElement(node), []);
  const widget = useRef<string | null>(null);
  const pending = useRef<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const [mountedWidget, setMountedWidget] = useState<{
    element: HTMLDivElement;
    siteKey: string;
  } | null>(null);
  useEffect(() => {
    if (!siteKey || !element) return;
    let cancelled = false;
    void loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widget.current = api.render(element, {
          sitekey: siteKey,
          action,
          theme: 'auto',
          execution: 'execute',
          appearance: 'interaction-only',
          callback: (token) => {
            pending.current?.resolve(token);
            pending.current = null;
          },
          'error-callback': () => {
            pending.current?.reject(new Error('verification'));
            pending.current = null;
          },
          'expired-callback': () => {
            pending.current?.reject(new Error('verification'));
            pending.current = null;
          },
        });
        setMountedWidget({ element, siteKey });
      })
      .catch(() => {
        if (!cancelled) setMountedWidget(null);
      });
    return () => {
      cancelled = true;
      pending.current?.reject(new Error('cancelled'));
      pending.current = null;
      if (widget.current) {
        window.turnstile?.remove(widget.current);
        widget.current = null;
      }
    };
  }, [siteKey, action, element]);
  const reset = useCallback(() => {
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);
  const getToken = useCallback(
    (signal: AbortSignal) =>
      new Promise<string>((resolve, reject) => {
        if (!widget.current || !window.turnstile) {
          reject(new Error('verification'));
          return;
        }
        if (signal.aborted) {
          reject(new Error('cancelled'));
          return;
        }
        if (pending.current) {
          reject(new Error('verification'));
          return;
        }
        const request = {
          resolve: (token: string) => {
            signal.removeEventListener('abort', abort);
            resolve(token);
          },
          reject: (error: Error) => {
            signal.removeEventListener('abort', abort);
            reject(error);
          },
        };
        function abort() {
          if (pending.current !== request) return;
          pending.current = null;
          if (widget.current) window.turnstile?.reset(widget.current);
          request.reject(new Error('timeout'));
        }
        pending.current = request;
        signal.addEventListener('abort', abort, { once: true });
        window.turnstile.reset(widget.current);
        window.turnstile.execute(widget.current);
      }),
    [],
  );
  return {
    container,
    ready: Boolean(
      siteKey && mountedWidget?.siteKey === siteKey && mountedWidget.element === element,
    ),
    getToken,
    reset,
  };
}
