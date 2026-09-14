export type ChatLocale = 'en' | 'fr' | 'es';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  locale: ChatLocale;
  history?: ChatMessage[];
  turnstileToken: string;
}

interface SourceIdentity {
  /** Number shown in the answer, for example "1" for [1]. */
  id: string;
  title: string;
}

export type ChatSource = SourceIdentity & ({ kind: 'page'; href: string } | { kind: 'note' });

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

export interface ChatConfig {
  available: boolean;
  turnstileSiteKey: string | null;
}

export type ChatErrorCode =
  | 'invalid_request'
  | 'forbidden'
  | 'body_too_large'
  | 'verification_failed'
  | 'rate_limited'
  | 'unavailable'
  | 'upstream_error';

export interface ChatErrorResponse {
  error: { code: ChatErrorCode; message: string };
}

export const CHAT_LIMITS = {
  messageCharacters: 1200,
  historyMessages: 6,
  historyMessageCharacters: 1200,
  bodyBytes: 16_384,
  turnstileTokenCharacters: 2048,
} as const;

export const TURNSTILE_ACTION = 'portfolio-chat';

export interface ContactRequest {
  name: string;
  email: string;
  message: string;
  locale: ChatLocale;
  turnstileToken: string;
}

export interface ContactResponse {
  /** Accepted by the email provider; inbox delivery is a separate outcome. */
  sent: true;
}

export type ContactConfig = ChatConfig;

export const CONTACT_LIMITS = {
  nameCharacters: 80,
  emailCharacters: 254,
  messageCharacters: 5000,
} as const;
export const CONTACT_TURNSTILE_ACTION = 'portfolio-contact';
