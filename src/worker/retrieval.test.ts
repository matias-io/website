import { describe, expect, it, vi } from 'vitest';
import { answerQuestion } from './retrieval';
import type { TrustedDocument, WorkerEnv } from './types';

const document: TrustedDocument = {
  key: 'portfolio-fr-project-robot-current.md',
  title: 'Robot',
  kind: 'page',
  href: '/projects/robot/',
  contentHash: 'current-hash',
};

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
    const run = vi.fn(async () => ({ response: 'Matias built a robot. [1]' }));
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
    const run = vi.fn(async () => ({ response: 'Matias built a robot. [1]' }));
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
