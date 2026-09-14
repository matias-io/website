import { describe, expect, it, vi } from 'vitest';
import { answerQuestion, readGroundedAnswer, selectEvidence } from './retrieval';
import type { TrustedDocument, WorkerEnv } from './types';

const document: TrustedDocument = {
  key: 'portfolio-fr-project-robot-current.md',
  title: 'Robot',
  kind: 'page',
  href: '/projects/robot/',
  contentHash: 'current-hash',
};

const robotEvidence = () =>
  selectEvidence(
    [
      {
        id: 'chunk-1',
        score: 0.8,
        text: 'Matias built a robot.',
        item: { key: document.key, metadata: { content_hash: document.contentHash } },
      },
    ],
    [document],
  );

const claim = (overrides: Record<string, unknown> = {}) => ({
  text: 'Matias built a robot.',
  sourceIds: ['1'],
  ...overrides,
});

describe('grounded answer parsing', () => {
  it('accepts an object response and adds citations from approved source IDs', () => {
    expect(readGroundedAnswer({ claims: [claim()] }, robotEvidence(), 'en')).toEqual({
      answer: 'Matias built a robot. [1]',
      sources: [{ id: '1', title: 'Robot', kind: 'page', href: '/projects/robot/' }],
    });
  });

  it('parses a JSON string response with structured claims', () => {
    expect(
      readGroundedAnswer(JSON.stringify({ claims: [claim()] }), robotEvidence(), 'fr'),
    ).toEqual({
      answer: 'Matias built a robot. [1]',
      sources: [{ id: '1', title: 'Robot', kind: 'page', href: '/projects/robot/' }],
    });
  });

  it.each([
    { name: 'an unknown source ID', value: { claims: [claim({ sourceIds: ['99'] })] } },
    { name: 'missing source IDs', value: { claims: [{ text: 'Matias built a robot.' }] } },
    { name: 'empty source IDs', value: { claims: [claim({ sourceIds: [] })] } },
    { name: 'malformed JSON', value: '{"claims":' },
    {
      name: 'more than four claims',
      value: {
        claims: Array.from({ length: 5 }, (_, index) => claim({ text: `Claim ${index + 1}` })),
      },
    },
  ])('rejects $name at runtime', ({ value }) => {
    expect(() => readGroundedAnswer(value, robotEvidence(), 'en')).toThrow('upstream_error');
  });

  it.each([
    [
      'en',
      'The available sources do not answer that question. You can contact Matias to learn more.',
    ],
    [
      'fr',
      'Les sources disponibles ne me permettent pas de répondre à cette question. Vous pouvez contacter Matias pour en savoir plus.',
    ],
    [
      'es',
      'Las fuentes disponibles no responden a esa pregunta. Puedes contactar con Matias para saber más.',
    ],
  ] as const)('returns the localized fallback for empty claims in %s', (locale, expected) => {
    expect(readGroundedAnswer({ claims: [] }, robotEvidence(), locale)).toEqual({
      answer: expected,
      sources: [],
    });
  });
});

describe('AI Search request shape', () => {
  it('retries an empty search once without changing its query or filters', async () => {
    const search = vi
      .fn()
      .mockResolvedValueOnce({ chunks: [] })
      .mockResolvedValue({
        chunks: [
          {
            id: 'recovered',
            score: 0.5,
            text: 'Matias built a robot.',
            item: { key: document.key, metadata: { content_hash: document.contentHash } },
          },
        ],
      });
    const run = vi.fn(async () => ({ response: { claims: [claim()] } }));
    const env = {
      KNOWLEDGE: { search },
      AI: { run },
      AI_GATEWAY_ID: 'gateway',
    } as unknown as WorkerEnv;
    const answer = await answerQuestion(
      { message: 'Quels projets a construit Matias ?', locale: 'fr', turnstileToken: 'token' },
      env,
      [document],
    );
    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0]).toEqual(search.mock.calls[1]);
    expect(run).toHaveBeenCalledTimes(1);
    expect(answer.sources[0].title).toBe('Robot');
  });

  it('filters retrieval to the requested content locale', async () => {
    const search = vi.fn(async () => ({
      chunks: [
        {
          id: 'chunk-1',
          score: 0.8,
          text: 'Matias built a robot.',
          item: { key: document.key, metadata: { content_hash: document.contentHash } },
        },
      ],
    }));
    const run = vi.fn(async () => ({ response: { claims: [claim()] } }));
    const env = {
      KNOWLEDGE: { search },
      AI: { run },
      AI_GATEWAY_ID: 'gateway',
    } as unknown as WorkerEnv;

    await answerQuestion(
      { message: 'Quels projets a construit Matias ?', locale: 'fr', turnstileToken: 'token' },
      env,
      [document],
    );

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        ai_search_options: expect.objectContaining({
          retrieval: expect.objectContaining({
            filters: { locale: { $eq: 'fr' } },
            keyword_match_mode: 'or',
            return_on_failure: true,
          }),
        }),
      }),
    );
  });
});
