import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactAvailable, handleContact, isEmail, parseContactRequest } from './contact';
import type { WorkerEnv } from './types';

const input = {
  name: 'A visitor',
  email: 'visitor@example.com',
  message: 'I would like to discuss a project.',
  locale: 'en',
  turnstileToken: 'captcha',
};
const environment = (overrides: Partial<WorkerEnv> = {}): WorkerEnv => ({
  ASSETS: {} as Fetcher,
  ENVIRONMENT: 'production',
  ALLOWED_HOSTNAMES: 'matiass.ca',
  CONTACT_ENABLED: 'true',
  CONTACT_FROM: 'sender@example.com',
  CONTACT_RECIPIENT: 'private@example.com',
  CONTACT_EMAIL: { send: vi.fn(async () => ({ messageId: 'accepted-test-id' })) },
  CONTACT_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
  TURNSTILE_SITE_KEY: 'public-key',
  TURNSTILE_SECRET_KEY: 'private-key',
  ...overrides,
});
const post = (body: unknown = input) =>
  new Request('https://matiass.ca/api/contact', {
    method: 'POST',
    headers: {
      origin: 'https://matiass.ca',
      'content-type': 'application/json',
      'cf-connecting-ip': '192.0.2.2',
    },
    body: JSON.stringify(body),
  });
afterEach(() => vi.unstubAllGlobals());

describe('contact validation', () => {
  it.each([
    'a@example.com\r\nBcc: other@example.com',
    'Name <a@example.com>',
    'a@localhost',
    'a..b@example.com',
    'a@-example.com',
    'a@example.com,other@example.com',
  ])('rejects malformed or injected mailbox %s', (address) => {
    expect(isEmail(address)).toBe(false);
  });

  it('accepts ordinary plus addresses and multilingual names', () => {
    expect(isEmail('a.person+portfolio@example.ca')).toBe(true);
    expect(parseContactRequest({ ...input, name: '  Inès Álvarez  ', locale: 'es' }).name).toBe(
      'Inès Álvarez',
    );
  });

  it('rejects oversized text and control characters in header-bound names', () => {
    for (const invalid of [
      { name: 'Person\r\nBcc: other@example.com' },
      { name: 'x'.repeat(81) },
      { message: 'x'.repeat(5001) },
      { message: '\0injected' },
      { turnstileToken: '' },
    ])
      expect(() => parseContactRequest({ ...input, ...invalid })).toThrow('invalid_request');
  });

  it('requires private configuration without exposing the recipient in configuration JSON', async () => {
    const env = environment();
    expect(contactAvailable(env)).toBe(true);
    expect(contactAvailable(environment({ CONTACT_RECIPIENT: undefined }))).toBe(false);
    expect(contactAvailable(environment({ CONTACT_ENABLED: 'false' }))).toBe(false);
    const result = await handleContact(new Request('https://matiass.ca/api/contact/config'), env);
    expect(await result.json()).toEqual({ available: true, turnstileSiteKey: 'public-key' });
  });
});

describe('contact delivery gate', () => {
  it("rejects the chat action's captcha on the contact endpoint", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: true, hostname: 'matiass.ca', action: 'portfolio-chat' }),
      ),
    );
    const env = environment();
    expect((await handleContact(post(), env)).status).toBe(403);
    expect(env.CONTACT_EMAIL?.send).not.toHaveBeenCalled();
  });

  it('applies its own quota before captcha verification or sending', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const env = environment({
      CONTACT_RATE_LIMITER: { limit: vi.fn(async () => ({ success: false })) },
    });
    const result = await handleContact(post(), env);
    expect(result.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(env.CONTACT_EMAIL?.send).not.toHaveBeenCalled();
  });

  it('uses fixed sender and secret recipient with a validated reply-to and text-only body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: true, hostname: 'matiass.ca', action: 'portfolio-contact' }),
      ),
    );
    const env = environment();
    const result = await handleContact(
      post({
        ...input,
        to: 'attacker@example.com',
        from: 'attacker@example.com',
        subject: 'Injected',
      }),
      env,
    );
    expect(result.status).toBe(202);
    expect(await result.json()).toEqual({ sent: true });
    expect(env.CONTACT_EMAIL?.send).toHaveBeenCalledWith({
      from: { email: 'sender@example.com', name: 'Matias Suxo portfolio' },
      to: 'private@example.com',
      replyTo: { email: input.email, name: input.name },
      subject: 'Portfolio contact',
      text: `Name: ${input.name}\nEmail: ${input.email}\nLanguage: en\n\n${input.message}`,
    });
  });

  it('does not claim a successful send or leak a provider error on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: true, hostname: 'matiass.ca', action: 'portfolio-contact' }),
      ),
    );
    const env = environment({
      CONTACT_EMAIL: {
        send: vi.fn(async () => {
          throw new Error('Private recipient and message provider payload');
        }),
      },
    });
    const result = await handleContact(post(), env);
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain('Private recipient');
  });
});
