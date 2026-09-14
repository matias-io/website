import {
  CHAT_LIMITS,
  CONTACT_LIMITS,
  CONTACT_TURNSTILE_ACTION,
  type ChatErrorCode,
  type ChatLocale,
  type ContactConfig,
  type ContactRequest,
  type ContactResponse,
} from '../shared/chat';
import { json } from './http';
import { verifyTurnstile } from './turnstile';
import type { WorkerEnv } from './types';
import { isAllowedOrigin, isRecord, readRequestJson, RequestError } from './validation';

/** A deliberately small mailbox syntax; never accepts a display name or header. */
export function isEmail(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length > CONTACT_LIMITS.emailCharacters ||
    /[\s<>\r\n]/.test(value)
  )
    return false;
  const parts = value.split('@');
  if (
    parts.length !== 2 ||
    parts[0].length > 64 ||
    parts[0].startsWith('.') ||
    parts[0].endsWith('.') ||
    parts[0].includes('..')
  )
    return false;
  return (
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(parts[0]) &&
    /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(parts[1])
  );
}

export function parseContactRequest(value: unknown): ContactRequest {
  if (!isRecord(value)) throw new RequestError('invalid_request', 400);
  const { name, email, message, locale, turnstileToken } = value;
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.length > CONTACT_LIMITS.nameCharacters ||
    /[\r\n\u0000-\u001f\u007f]/u.test(name) ||
    !isEmail(email) ||
    typeof message !== 'string' ||
    !message.trim() ||
    message.length > CONTACT_LIMITS.messageCharacters ||
    message.includes('\0') ||
    (locale !== 'en' && locale !== 'fr' && locale !== 'es') ||
    typeof turnstileToken !== 'string' ||
    !turnstileToken.trim() ||
    turnstileToken.length > CHAT_LIMITS.turnstileTokenCharacters
  ) {
    throw new RequestError('invalid_request', 400);
  }
  return { name: name.trim(), email, message: message.trim(), locale, turnstileToken };
}

export function contactAvailable(env: WorkerEnv): boolean {
  return (
    env.CONTACT_ENABLED === 'true' &&
    Boolean(
      env.CONTACT_EMAIL &&
      env.CONTACT_RATE_LIMITER &&
      isEmail(env.CONTACT_FROM) &&
      isEmail(env.CONTACT_RECIPIENT) &&
      env.TURNSTILE_SITE_KEY &&
      env.TURNSTILE_SECRET_KEY &&
      env.ALLOWED_HOSTNAMES,
    )
  );
}

const messages: Record<ChatLocale, Record<ChatErrorCode, string>> = {
  en: {
    invalid_request: 'Check your name, email address and message, then try again.',
    forbidden: 'This request is not allowed.',
    body_too_large: 'Your message is too long. Please shorten it.',
    verification_failed: 'Verification expired or failed. Please verify again.',
    rate_limited: 'Too many messages. Please wait a minute before trying again.',
    unavailable: 'The contact form is not available right now. You can contact Matias on LinkedIn.',
    upstream_error: 'The email service could not accept your message. Please try again later.',
  },
  fr: {
    invalid_request: 'Vérifiez votre nom, votre adresse courriel et votre message, puis réessayez.',
    forbidden: "Cette requête n'est pas autorisée.",
    body_too_large: 'Votre message est trop long. Veuillez le raccourcir.',
    verification_failed: 'La vérification a expiré ou a échoué. Veuillez réessayer.',
    rate_limited: 'Trop de messages. Veuillez attendre une minute avant de réessayer.',
    unavailable:
      "Le formulaire n'est pas disponible pour le moment. Vous pouvez contacter Matias sur LinkedIn.",
    upstream_error:
      "Le service de courriel n'a pas pu accepter votre message. Veuillez réessayer plus tard.",
  },
  es: {
    invalid_request: 'Revisa tu nombre, correo electrónico y mensaje, e inténtalo de nuevo.',
    forbidden: 'Esta solicitud no está permitida.',
    body_too_large: 'Tu mensaje es demasiado largo. Acórtalo.',
    verification_failed: 'La verificación caducó o falló. Vuelve a verificar.',
    rate_limited: 'Demasiados mensajes. Espera un minuto antes de intentarlo de nuevo.',
    unavailable: 'El formulario no está disponible ahora. Puedes contactar con Matias en LinkedIn.',
    upstream_error:
      'El servicio de correo no pudo aceptar tu mensaje. Inténtalo de nuevo más tarde.',
  },
};

export async function handleContact(request: Request, env: WorkerEnv): Promise<Response> {
  if (new URL(request.url).pathname === '/api/contact/config') {
    if (request.method !== 'GET')
      return json({ error: { code: 'method_not_allowed', message: 'Use GET.' } }, 405, {
        allow: 'GET',
      });
    const available = contactAvailable(env);
    const configuration: ContactConfig = {
      available,
      turnstileSiteKey: available ? (env.TURNSTILE_SITE_KEY ?? null) : null,
    };
    return json(configuration);
  }
  if (request.method !== 'POST')
    return json({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405, {
      allow: 'POST',
    });
  let locale: ChatLocale = 'en';
  try {
    if (!isAllowedOrigin(request, env)) throw new RequestError('forbidden', 403);
    const submission = parseContactRequest(await readRequestJson(request));
    locale = submission.locale;
    if (!contactAvailable(env) || !env.CONTACT_EMAIL || !env.CONTACT_FROM || !env.CONTACT_RECIPIENT)
      throw new RequestError('unavailable', 503);
    const ip = request.headers.get('cf-connecting-ip');
    if (!ip && env.ENVIRONMENT !== 'development') throw new RequestError('forbidden', 403);
    const limited = await env.CONTACT_RATE_LIMITER?.limit({
      key: `portfolio-contact:${ip ?? 'local'}`,
    });
    if (!limited?.success) throw new RequestError('rate_limited', 429);
    if (
      !(await verifyTurnstile(submission.turnstileToken, request, env, CONTACT_TURNSTILE_ACTION))
    ) {
      throw new RequestError('verification_failed', 403);
    }
    const result = await env.CONTACT_EMAIL.send({
      from: { email: env.CONTACT_FROM, name: 'Matias Suxo portfolio' },
      to: env.CONTACT_RECIPIENT,
      replyTo: { email: submission.email, name: submission.name },
      subject: 'Portfolio contact',
      text: `Name: ${submission.name}\nEmail: ${submission.email}\nLanguage: ${submission.locale}\n\n${submission.message}`,
    });
    if (!result.messageId) throw new RequestError('upstream_error', 503);
    const response: ContactResponse = { sent: true };
    return json(response, 202);
  } catch (error) {
    const failure = error instanceof RequestError ? error : new RequestError('upstream_error', 503);
    // Never return or log provider errors: they may contain message text or addresses.
    return json(
      { error: { code: failure.code, message: messages[locale][failure.code] } },
      failure.status,
      failure.status === 429 ? { 'retry-after': '60' } : undefined,
    );
  }
}
