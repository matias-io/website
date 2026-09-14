import { describe, expect, it } from 'vitest';
import { runConcurrently } from './concurrency.mjs';

const pause = () => new Promise((resolve) => setTimeout(resolve, 1));

describe('knowledge upload concurrency', () => {
  it('processes every document once without exceeding the configured limit', async () => {
    const items = Array.from({ length: 13 }, (_, index) => index);
    const completed = [];
    let active = 0;
    let maximum = 0;
    await runConcurrently(items, 4, async (item) => {
      maximum = Math.max(maximum, ++active);
      await pause();
      completed.push(item);
      active -= 1;
    });
    expect(maximum).toBe(4);
    expect(completed.toSorted((a, b) => a - b)).toEqual(items);
    expect(active).toBe(0);
  });

  it('waits for all remaining work before rejecting, so release finalization cannot race uploads', async () => {
    const completed = [];
    const failure = new Error('An upload failed verification.');
    await expect(
      runConcurrently([0, 1, 2, 3, 4, 5], 4, async (item) => {
        if (item === 1) throw failure;
        await pause();
        completed.push(item);
      }),
    ).rejects.toMatchObject({ errors: [failure] });
    expect(completed.toSorted((a, b) => a - b)).toEqual([0, 2, 3, 4, 5]);
  });
});
