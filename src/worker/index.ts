import type { ChatConfig, ChatErrorCode, ChatErrorResponse, ChatLocale } from '../shared/chat';
import manifest from './generated/manifest.json';
import { handleContact } from './contact';
import { json } from './http';
import { answerQuestion } from './retrieval';
import { verifyTurnstile } from './turnstile';
import type { TrustedDocument, WorkerEnv } from './types';
import { isAllowedOrigin, parseChatRequest, readRequestJson, RequestError } from './validation';

const documents = manifest as TrustedDocument[];

const errors: Record<ChatLocale, Record<ChatErrorCode, string>> = {
  en: {
    invalid_request: 'Please enter a shorter message and try again.',
    forbidden: 'This request is not allowed.',
    body_too_large: 'This conversation is too long. Start a new conversation.',
    verification_failed: 'Verification expired or failed. Please verify again.',
    rate_limited: 'Too many messages. Please wait a minute before trying again.',
    unavailable:
      'The AI guide is not available right now. You can still explore the portfolio or contact Matias.',
    upstream_error:
      'The AI guide could not produce a sourced answer. Please try again in a moment.',
  },
  fr: {
    invalid_request: 'Veuillez raccourcir votre message et réessayer.',
    forbidden: "Cette requête n'est pas autorisée.",
    body_too_large: 'Cette conversation est trop longue. Commencez une nouvelle conversation.',
    verification_failed: 'La vérification a expiré ou a échoué. Veuillez réessayer.',
    rate_limited: 'Trop de messages. Veuillez attendre une minute avant de réessayer.',
    unavailable:
      "Le guide IA n'est pas disponible pour le moment. Vous pouvez consulter le portfolio ou contacter Matias.",
    upstream_error:
      "Le guide IA n'a pas pu produire une réponse avec des sources. Veuillez réessayer dans un moment.",
  },
  es: {
    invalid_request: 'Escribe un mensaje más corto e inténtalo de nuevo.',
    forbidden: 'Esta solicitud no está permitida.',
    body_too_large: 'Esta conversación es demasiado larga. Inicia una nueva conversación.',
    verification_failed: 'La verificación caducó o falló. Vuelve a verificar.',
    rate_limited: 'Demasiados mensajes. Espera un minuto antes de intentarlo de nuevo.',
    unavailable:
      'La guía de IA no está disponible ahora. Puedes consultar el portafolio o contactar con Matias.',
    upstream_error:
      'La guía de IA no pudo generar una respuesta con fuentes. Inténtalo de nuevo en un momento.',
  },
};

export function chatAvailable(env: WorkerEnv, contentCount = documents.length): boolean {
  return (
    env.CHAT_ENABLED === 'true' &&
    contentCount > 0 &&
    Boolean(
      env.AI &&
      env.KNOWLEDGE &&
      env.CHAT_RATE_LIMITER &&
      env.AI_GATEWAY_ID &&
      env.TURNSTILE_SITE_KEY &&
      env.TURNSTILE_SECRET_KEY &&
      env.ALLOWED_HOSTNAMES,
    )
  );
}

function failure(error: RequestError, locale: ChatLocale): Response {
  const body: ChatErrorResponse = {
    error: { code: error.code, message: errors[locale][error.code] },
  };
  return json(body, error.status, error.status === 429 ? { 'retry-after': '60' } : undefined);
}

export async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/api/contact' || path === '/api/contact/config') return handleContact(request, env);
  if (path === '/api/chat/config' && request.method === 'GET') {
    const available = chatAvailable(env);
    const config: ChatConfig = {
      available,
      turnstileSiteKey: available ? (env.TURNSTILE_SITE_KEY ?? null) : null,
    };
    return json(config);
  }
  if (path !== '/api/chat') {
    return path.startsWith('/api/')
      ? json({ error: { code: 'not_found', message: 'Not found.' } }, 404)
      : env.ASSETS.fetch(request);
  }
  if (request.method !== 'POST')
    return json({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405, {
      allow: 'POST',
    });
  let locale: ChatLocale = 'en';
  try {
    if (!isAllowedOrigin(request, env)) throw new RequestError('forbidden', 403);
    const input = parseChatRequest(await readRequestJson(request));
    locale = input.locale;
    if (!chatAvailable(env)) throw new RequestError('unavailable', 503);
    const ip = request.headers.get('cf-connecting-ip');
    if (!ip && env.ENVIRONMENT !== 'development') throw new RequestError('forbidden', 403);
    const limited = await env.CHAT_RATE_LIMITER?.limit({ key: `portfolio-chat:${ip ?? 'local'}` });
    if (!limited?.success) throw new RequestError('rate_limited', 429);
    if (!(await verifyTurnstile(input.turnstileToken, request, env)))
      throw new RequestError('verification_failed', 403);
    return json(await answerQuestion(input, env, documents));
  } catch (error) {
    if (error instanceof RequestError) return failure(error, locale);
    // Do not log visitor questions, conversation text, tokens, or upstream payloads.
    console.error('portfolio-chat upstream request failed');
    return failure(new RequestError('upstream_error', 503), locale);
  }
}

export default { fetch: handleRequest } satisfies ExportedHandler<WorkerEnv>;
