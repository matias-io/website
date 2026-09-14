import { describe, expect, it, vi } from 'vitest';
import worker from './index';
import type { WorkerEnv } from './types';

function environment(response: Response, mode = 'preview'): WorkerEnv {
  return {
    ENVIRONMENT: mode,
    ASSETS: { fetch: vi.fn(async () => response) } as unknown as Fetcher,
  };
}

describe('preview indexing policy', () => {
  it('marks static responses without changing their content or cache headers', async () => {
    const asset = new Response('<main>Matias</main>', {
      headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=3600' },
    });
    const response = await worker.fetch(
      new Request('https://matiass-preview.example.workers.dev/'),
      environment(asset),
    );

    expect(response.headers.get('x-robots-tag')).toBe('noindex, follow');
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(await response.text()).toBe('<main>Matias</main>');
    expect(asset.headers.has('x-robots-tag')).toBe(false);
  });

  it('preserves immutable redirects while adding the preview policy', async () => {
    const target = 'https://matiass-preview.example.workers.dev/projects/';
    const redirect = Response.redirect(target, 308);
    const response = await worker.fetch(
      new Request('https://matiass-preview.example.workers.dev/projects'),
      environment(redirect),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(target);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, follow');
    expect(response.body).toBeNull();
    expect(redirect.headers.has('x-robots-tag')).toBe(false);
  });

  it.each(['production', 'development'])(
    'leaves the original %s response and indexing policy unchanged',
    async (mode) => {
      const asset = new Response('asset', { headers: { 'x-robots-tag': 'index, follow' } });
      const response = await worker.fetch(
        new Request('https://matiass.ca/'),
        environment(asset, mode),
      );

      expect(response).toBe(asset);
      expect(response.headers.get('x-robots-tag')).toBe('index, follow');
    },
  );

  it.each([
    ['/api/chat/config', 200],
    ['/api/contact/config', 200],
    ['/api/missing', 404],
    ['/api/chat', 405],
  ])('also marks %s API responses, including errors', async (path, status) => {
    const response = await worker.fetch(
      new Request(`https://matiass-preview.example.workers.dev${path}`),
      environment(new Response('unused')),
    );

    expect(response.status).toBe(status);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, follow');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
