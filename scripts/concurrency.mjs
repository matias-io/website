/** Complete every item with bounded concurrency, then report any failures together. */
export async function runConcurrently(items, concurrency, task) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('Concurrency must be a positive integer.');
  }
  let next = 0;
  const failures = [];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        await task(item);
      } catch (error) {
        failures.push(error);
      }
    }
  });
  await Promise.all(workers);
  if (failures.length) {
    throw new AggregateError(
      failures,
      `${failures.length} knowledge uploads failed. No documents were pruned.`,
    );
  }
}
