import { describe, expect, it } from 'vitest';
import { shouldShowStartup } from './startup-policy';

describe('startup policy', () => {
  it('shows the intro for the home document load', () => {
    expect(
      shouldShowStartup({ pathname: '/', lifecycle: 'document-load', navigationType: 'navigate' }),
    ).toBe(true);
  });

  it('shows the intro for a hard refresh on a deep route', () => {
    expect(
      shouldShowStartup({
        pathname: '/projects/elvyn/',
        lifecycle: 'document-load',
        navigationType: 'reload',
      }),
    ).toBe(true);
  });

  it('skips a fresh deep link', () => {
    expect(
      shouldShowStartup({
        pathname: '/projects/elvyn/',
        lifecycle: 'document-load',
        navigationType: 'navigate',
      }),
    ).toBe(false);
  });

  it('does not replay during an SPA route change', () => {
    expect(
      shouldShowStartup({ pathname: '/', lifecycle: 'spa-route', navigationType: 'navigate' }),
    ).toBe(false);
  });
});
