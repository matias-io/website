import {
  CHAT_LIMITS,
  type ChatErrorCode,
  type ChatMessage,
  type ChatRequest,
} from '../shared/chat';
import type { WorkerEnv } from './types';

export class RequestError extends Error {
  constructor(
    readonly code: ChatErrorCode,
    readonly status: number,
  ) {
    super(code);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
}

export function parseChatRequest(value: unknown): ChatRequest {
  if (!isRecord(value)) throw new RequestError('invalid_request', 400);
  const { message, locale, history = [], turnstileToken } = value;
  if (
    !boundedText(message, CHAT_LIMITS.messageCharacters) ||
    (locale !== 'en' && locale !== 'fr' && locale !== 'es') ||
    !boundedText(turnstileToken, CHAT_LIMITS.turnstileTokenCharacters) ||
    !Array.isArray(history) ||
    history.length > CHAT_LIMITS.historyMessages
  ) {
    throw new RequestError('invalid_request', 400);
  }
  const messages: ChatMessage[] = history.map((item: unknown) => {
    if (
      !isRecord(item) ||
      (item.role !== 'user' && item.role !== 'assistant') ||
      !boundedText(item.content, CHAT_LIMITS.historyMessageCharacters)
    ) {
      throw new RequestError('invalid_request', 400);
    }
    return { role: item.role, content: item.content.trim() };
  });
  return { message: message.trim(), locale, history: messages, turnstileToken };
}

/** Limit bytes while reading, including requests without Content-Length. */
export async function readRequestJson(request: Request): Promise<unknown> {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .match(/^application\/json(?:\s*;|$)/)
  ) {
    throw new RequestError('invalid_request', 400);
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (declaredLength > CHAT_LIMITS.bodyBytes) throw new RequestError('body_too_large', 413);
  if (!request.body) throw new RequestError('invalid_request', 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > CHAT_LIMITS.bodyBytes) {
        await reader.cancel();
        throw new RequestError('body_too_large', 413);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(body),
    ) as unknown;
  } catch {
    throw new RequestError('invalid_request', 400);
  }
}

export function allowedHostnames(env: WorkerEnv): Set<string> {
  const hosts = new Set(
    (env.ALLOWED_HOSTNAMES ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  if (env.ENVIRONMENT === 'development') {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
  }
  return hosts;
}

/** Origin validation complements Turnstile; it is not authentication. */
export function isAllowedOrigin(request: Request, env: WorkerEnv): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    const local =
      env.ENVIRONMENT === 'development' &&
      ['localhost', '127.0.0.1'].includes(source.hostname) &&
      ['3300', '3301', '8787'].includes(source.port);
    return (
      source.origin === origin &&
      allowedHostnames(env).has(source.hostname) &&
      (local || (source.protocol === 'https:' && source.origin === target.origin))
    );
  } catch {
    return false;
  }
}
