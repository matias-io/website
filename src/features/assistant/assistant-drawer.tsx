'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, ArrowUpRight, FileText, RotateCcw, X } from 'lucide-react';
import { usePortfolio } from '@/i18n/provider';
import { useSound } from '@/features/audio/audio-provider';
import type { ChatResponse, ChatSource } from '@/shared/chat';
import { useVerification } from './use-verification';
import './assistant-drawer.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

interface ChatConfig {
  available: boolean;
  turnstileSiteKey: string | null;
}

function isReply(value: unknown): value is ChatResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.answer === 'string' &&
    Array.isArray(record.sources) &&
    record.sources.every(
      (source) =>
        source &&
        typeof source === 'object' &&
        typeof source.id === 'string' &&
        typeof source.title === 'string' &&
        (source.kind === 'note' ||
          (source.kind === 'page' &&
            typeof source.href === 'string' &&
            source.href.startsWith('/') &&
            !source.href.startsWith('//'))),
    )
  );
}

export function AssistantDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = usePortfolio();
  const { play } = useSound();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const { container, ready, getToken, reset } = useVerification(
    config?.available ? config.turnstileSiteKey : null,
    'portfolio-chat',
  );

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      input.current?.focus();
    } else {
      dialog.current?.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open || config) return;
    const controller = new AbortController();
    void fetch('/api/chat/config', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const value: unknown = await response.json();
        if (!value || typeof value !== 'object' || !('available' in value)) throw new Error();
        const object = value as ChatConfig;
        setConfig({
          available: object.available === true,
          turnstileSiteKey:
            typeof object.turnstileSiteKey === 'string' ? object.turnstileSiteKey : null,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setConfig({ available: false, turnstileSiteKey: null });
      });
    return () => controller.abort();
  }, [open, config]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || busy || !config?.available || !ready) return;

    setBusy(true);
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const token = await getToken(controller.signal);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          locale,
          history: messages.slice(-6).map((message) => ({
            role: message.role,
            content: message.content.slice(0, 1200),
          })),
          turnstileToken: token,
        }),
        signal: controller.signal,
      });
      const value: unknown = await response.json();
      if (!response.ok) {
        let message = t('chatError');
        if (value && typeof value === 'object' && 'error' in value) {
          const failure = value.error;
          if (
            failure &&
            typeof failure === 'object' &&
            'message' in failure &&
            typeof failure.message === 'string'
          ) {
            message = failure.message;
          }
        }
        throw new Error(message);
      }
      if (!isReply(value)) throw new Error(t('chatError'));
      setMessages((current) => [
        ...current,
        { role: 'user', content: question },
        { role: 'assistant', content: value.answer, sources: value.sources },
      ]);
      setDraft('');
      play('open');
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      setError(
        message && !['verification', 'timeout', 'cancelled'].includes(message)
          ? message
          : t('verify'),
      );
    } finally {
      clearTimeout(timeout);
      abort.current = null;
      reset();
      setBusy(false);
    }
  }

  function selectSource(source: ChatSource) {
    if (source.kind !== 'page') return;
    onClose();
    setTimeout(() => {
      const id = source.href.split('#')[1];
      if (!id) return;
      const target = document.getElementById(id);
      target?.setAttribute('tabindex', '-1');
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      });
      target?.classList.add('citation-highlight');
      setTimeout(() => target?.classList.remove('citation-highlight'), 1800);
    }, 350);
  }

  return (
    <dialog
      className="assistant-dialog"
      id="assistant-dialog"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="assistant-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="assistant-inner">
        <header className="assistant-header">
          <span className="assistant-avatar">
            <Image
              className="assistant-avatar-image"
              src="/media/matias-avatar.webp"
              alt=""
              width={160}
              height={160}
              aria-hidden="true"
            />
          </span>
          <div>
            <h2 id="assistant-title">{t('assistant')}</h2>
            <span>{t('aiNotice')}</span>
          </div>
          <button onClick={onClose} aria-label={t('close')}>
            <X size={20} />
          </button>
        </header>
        <div className="chat-messages" aria-live="polite" aria-relevant="additions text">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <p>{t('ask')}</p>
              <div>
                {(['suggestionAi', 'suggestionRobotics', 'suggestionStack'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setDraft(t(key));
                      input.current?.focus();
                    }}
                  >
                    {t(key)}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={index}>
              <p>{message.content}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="chat-sources" aria-label={t('sources')}>
                  {message.sources.map((source) =>
                    source.kind === 'page' ? (
                      <Link
                        key={source.id}
                        href={source.href}
                        scroll={false}
                        onClick={() => selectSource(source)}
                      >
                        <span>{source.id}</span>
                        {source.title}
                        <ArrowUpRight size={13} />
                      </Link>
                    ) : (
                      <span className="note-source" key={source.id}>
                        <FileText size={13} />
                        <span>{source.id}</span>
                        {source.title}
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && <p className="chat-status">{t('thinking')}</p>}
          <div ref={messagesEnd} />
        </div>
        {config && !config.available && (
          <p className="chat-unavailable" role="status">
            {t('unavailable')}
          </p>
        )}
        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={submit} className="chat-form">
          <div ref={container} className="turnstile-container" />
          <div className="chat-composer">
            <textarea
              ref={input}
              aria-label={t('question')}
              placeholder={t('questionPlaceholder')}
              value={draft}
              maxLength={1200}
              rows={2}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              aria-label={t('send')}
              disabled={!draft.trim() || busy || !config?.available || !ready}
            >
              <ArrowUp size={19} />
            </button>
          </div>
          <div className="chat-meta">
            <p>{t('chatPrivacy')}</p>
            {messages.length > 0 && (
              <button
                type="button"
                aria-label={t('clearChat')}
                disabled={busy}
                onClick={() => {
                  setMessages([]);
                  setError('');
                }}
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </form>
      </div>
    </dialog>
  );
}
