'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Check } from 'lucide-react';
import { usePortfolio } from '@/i18n/provider';
import { useVerification } from '@/features/assistant/use-verification';

export function ContactForm() {
  const { t } = useTranslation('contact');
  const { locale } = usePortfolio();
  const [config, setConfig] = useState<{
    available: boolean;
    turnstileSiteKey: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const successMessage = useRef<HTMLParagraphElement>(null);
  const controller = useRef<AbortController | null>(null);
  const { container, ready, getToken, reset } = useVerification(
    config?.available ? config.turnstileSiteKey : null,
    'portfolio-contact',
  );
  useEffect(() => {
    const request = new AbortController();
    void fetch('/api/contact/config', { signal: request.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const value: unknown = await response.json();
        if (!value || typeof value !== 'object') throw new Error();
        const data = value as Record<string, unknown>;
        setConfig({
          available: data.available === true,
          turnstileSiteKey:
            typeof data.turnstileSiteKey === 'string' ? data.turnstileSiteKey : null,
        });
      })
      .catch(() => {
        if (!request.signal.aborted) setConfig({ available: false, turnstileSiteKey: null });
      });
    return () => {
      request.abort();
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (sent) successMessage.current?.focus();
  }, [sent]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !config?.available) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 60000);
    try {
      const token = await getToken(request.signal);
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          message: data.get('message'),
          locale,
          turnstileToken: token,
        }),
        signal: request.signal,
      });
      const value: unknown = await response.json();
      if (
        !response.ok ||
        !value ||
        typeof value !== 'object' ||
        !('sent' in value) ||
        value.sent !== true
      )
        throw new Error(t('error'));
      setSent(true);
      form.reset();
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message === 'verification'
          ? t('verification')
          : t('error'),
      );
    } finally {
      clearTimeout(timeout);
      reset();
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div className="contact-success" role="status">
        <Check size={23} />
        <p ref={successMessage} tabIndex={-1}>
          {t('sent')}
        </p>
        <button onClick={() => setSent(false)}>{t('again')}</button>
      </div>
    );
  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="contact-fields">
        <label>
          {t('name')}
          <input
            name="name"
            autoComplete="name"
            placeholder={t('namePlaceholder')}
            required
            maxLength={80}
          />
        </label>
        <label>
          {t('email')}
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            required
            maxLength={254}
          />
        </label>
      </div>
      <label>
        {t('message')}
        <textarea
          name="message"
          rows={4}
          placeholder={t('messagePlaceholder')}
          required
          maxLength={5000}
        />
      </label>
      <div ref={container} />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {config && !config.available && (
        <p className="form-unavailable" role="status">
          {t('unavailable')}
        </p>
      )}
      <div className="contact-submit">
        <p>{t('privacy')}</p>
        <button disabled={busy || !config?.available || !ready} type="submit">
          {busy ? t('sending') : t('send')}
          <ArrowUpRight size={15} />
        </button>
      </div>
    </form>
  );
}
