import { TURNSTILE_ACTION } from '../shared/chat';
import { allowedHostnames, isRecord } from './validation';
import type { WorkerEnv } from './types';

export function isValidVerification(
  value: unknown,
  expectedHosts: Set<string>,
  action = TURNSTILE_ACTION,
): boolean {
  return (
    isRecord(value) &&
    value.success === true &&
    value.action === action &&
    typeof value.hostname === 'string' &&
    expectedHosts.has(value.hostname.toLowerCase())
  );
}

export async function verifyTurnstile(
  token: string,
  request: Request,
  env: WorkerEnv,
  action = TURNSTILE_ACTION,
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: request.headers.get('cf-connecting-ip') ?? undefined,
      idempotency_key: crypto.randomUUID(),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  return isValidVerification(await response.json(), allowedHostnames(env), action);
}
