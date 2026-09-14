import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runConcurrently } from './concurrency.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const createInstance = args.has('--create');
const prune = args.has('--prune');
const acceptedArguments = new Set(['--dry-run', '--create', '--prune', '--allow-large-delete']);
if ([...args].some((argument) => !acceptedArguments.has(argument))) {
  throw new Error(
    'Unknown sync option. Use --dry-run, --create, --prune, or --allow-large-delete.',
  );
}
if (prune && createInstance)
  throw new Error('--prune cannot create an instance. Synchronize and deploy first.');
const account = process.env.CLOUDFLARE_ACCOUNT_ID ?? 'd017fa417783a5e8da010c5789f5c94f';
const instance = process.env.KNOWLEDGE_INSTANCE ?? 'matiass-public';
const gateway = process.env.AI_GATEWAY_ID ?? 'matiass-assistant';
const token = process.env.AI_SEARCH_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
const namespace = 'default';
const prefix = `https://api.cloudflare.com/client/v4/accounts/${account}/ai-search/namespaces/${namespace}/instances`;
const base = `${prefix}/${encodeURIComponent(instance)}`;
const release = JSON.parse(await readFile(resolve(root, '.local/knowledge/release.json'), 'utf8'));

if (
  !/^[a-f0-9]{32}$/.test(account) ||
  !/^[a-z0-9_]+(?:-[a-z0-9_]+)*$/.test(instance) ||
  !/^[a-z0-9_]+(?:-[a-z0-9_]+)*$/.test(gateway)
) {
  throw new Error('Invalid Cloudflare account ID, AI Search instance name or gateway name.');
}
if (!Array.isArray(release.documents) || release.documents.length < 4)
  throw new Error('Build the public knowledge collection before syncing.');
for (const document of release.documents) {
  if (
    !/^portfolio-(en|fr|es)-[a-z0-9-]+\.md$/.test(document.key) ||
    !/^[a-f0-9]{64}$/.test(document.contentHash)
  ) {
    throw new Error('The knowledge release contains an invalid document key or hash.');
  }
}
if (!token) {
  if (dryRun) {
    console.log(
      `Local ${prune ? 'prune' : 'sync'} preview: ${release.documents.length} approved documents for ${instance}. No remote comparison or changes performed.`,
    );
    process.exit(0);
  }
  throw new Error(
    'Set AI_SEARCH_API_TOKEN or CLOUDFLARE_API_TOKEN with AI Search Edit and Run permissions. Tokens belong in environment/build secrets.',
  );
}

const pause = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));
let rateLimitedUntil = 0;
async function request(url, options = {}, allowMissing = false) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    while (rateLimitedUntil > Date.now()) await pause(rateLimitedUntil - Date.now());
    const headers = new Headers(options.headers);
    headers.set('authorization', `Bearer ${token}`);
    let response;
    try {
      response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(60_000) });
    } catch {
      if (attempt < 2) {
        await pause(1000 * 2 ** attempt);
        continue;
      }
      throw new Error(
        'Cloudflare AI Search request timed out or failed to connect after three attempts.',
      );
    }
    if (allowMissing && response.status === 404) return null;
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retrySeconds = Number(response.headers.get('retry-after'));
      const backoff = Math.max(
        1000 * 2 ** attempt,
        Number.isFinite(retrySeconds) ? retrySeconds * 1000 : 0,
      );
      if (response.status === 429)
        rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + backoff);
      await pause(backoff);
      continue;
    }
    const payload = await response.json();
    if (!response.ok || payload.success !== true) {
      // API error bodies may contain content or token details. Report status and numeric codes only.
      const codes = Array.isArray(payload.errors)
        ? payload.errors.map((error) => error.code).join(',')
        : 'unknown';
      throw new Error(
        `Cloudflare AI Search request failed: HTTP ${response.status}, code ${codes}.`,
      );
    }
    return payload;
  }
  throw new Error('Cloudflare AI Search retry limit reached.');
}

let configuration = await request(base, {}, true);
if (!configuration && !createInstance)
  throw new Error(
    `AI Search instance ${instance} does not exist. Provision it first, or explicitly use --create.`,
  );
if (!configuration && dryRun) {
  console.log(
    `Would create ${instance} and upload ${release.documents.length} documents. No changes performed.`,
  );
  process.exit(0);
}
if (!configuration) {
  configuration = await request(prefix, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: instance,
      ai_gateway_id: gateway,
      embedding_model: '@cf/baai/bge-m3',
      index_method: { vector: true, keyword: true },
      chunk_size: 384,
      chunk_overlap: 10,
      rewrite_query: false,
      reranking: false,
      cache: false,
      custom_metadata: [
        { field_name: 'content_id', data_type: 'text' },
        { field_name: 'locale', data_type: 'text' },
        { field_name: 'content_hash', data_type: 'text' },
      ],
      public_endpoint_params: {
        enabled: false,
      },
    }),
  });
}

const settings = configuration.result;
if (settings.ai_gateway_id !== gateway)
  throw new Error(
    `Connect AI Search to the configured ${gateway} gateway before syncing so indexing and retrieval use the portfolio's privacy and budget settings.`,
  );
if (settings.public_endpoint_params?.enabled === true)
  throw new Error(
    "Disable the AI Search public endpoint before syncing. Public endpoints bypass this site's Turnstile gate.",
  );
const namespaceSettings = (
  await request(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai-search/namespaces/${namespace}`,
  )
).result;
if (
  namespaceSettings.public_endpoint_params?.enabled === true &&
  namespaceSettings.public_endpoint_params.instances_allowed?.includes(instance)
) {
  throw new Error(
    'The namespace public endpoint exposes this instance. Remove it from instances_allowed before syncing.',
  );
}
if (!settings.index_method?.vector || !settings.index_method?.keyword)
  throw new Error('The AI Search instance must enable both vector and keyword indexing.');
if (settings.embedding_model !== '@cf/baai/bge-m3')
  throw new Error(
    'Embedding model differs from the configured BGE-M3 index. Use a new versioned instance for model migrations.',
  );
if (
  !settings.custom_metadata?.some(
    (field) => field.field_name === 'content_hash' && field.data_type === 'text',
  )
) {
  throw new Error(
    'Define the content_hash text metadata field on the AI Search instance before syncing.',
  );
}

const existing = [];
for (let page = 1; ; page += 1) {
  const response = await request(`${base}/items?source=builtin&page=${page}&per_page=50`);
  if (!Array.isArray(response.result)) throw new Error('Unexpected AI Search items response.');
  existing.push(...response.result);
  if (
    response.result.length === 0 ||
    existing.length >= (response.result_info?.total_count ?? Number.POSITIVE_INFINITY)
  )
    break;
  if (response.result.length < 50) break;
}
const wanted = new Set(release.documents.map((document) => document.key));
const owned = existing.filter(
  (item) => item.source_id === 'builtin' && /^portfolio-(en|fr|es)-[a-z0-9-]+\.md$/.test(item.key),
);
const removed = owned.filter((item) => !wanted.has(item.key));
if (prune && removed.length > owned.length / 2 && !args.has('--allow-large-delete')) {
  throw new Error(
    'More than half the managed documents would be removed. Check the content build; use --allow-large-delete only for an intended large removal.',
  );
}
const current = new Map(owned.map((item) => [item.key, item]));
const changed = release.documents.filter((document) => {
  const old = current.get(document.key);
  return (
    old?.metadata?.content_hash !== document.contentHash ||
    old.status !== 'completed' ||
    !(old.chunks_count > 0)
  );
});
if (prune && changed.length > 0) {
  throw new Error(
    'Cannot prune: the current release is not fully indexed. Synchronize and successfully deploy this exact release first.',
  );
}
console.log(
  `${instance}: ${changed.length} uploads, ${release.documents.length - changed.length} unchanged, ${removed.length} old documents ${prune ? 'to remove' : 'retained'}.`,
);
if (dryRun) {
  console.log('Dry run complete. No remote changes performed.');
  process.exit(0);
}

let completed = release.documents.length - changed.length;
let accepted = completed;
const submitted = new Map();
if (changed.length)
  console.log('Uploading with at most four concurrent requests, then verifying indexing.');
await runConcurrently(changed, 4, async (document) => {
  const started = Date.now();
  const content = await readFile(resolve(root, '.local/knowledge', document.key), 'utf8');
  if (createHash('sha256').update(content).digest('hex') !== document.contentHash) {
    throw new Error(
      `Generated content changed after its manifest was built: ${document.key}. Run knowledge:build again.`,
    );
  }
  const form = new FormData();
  form.set('file', new File([content], document.key, { type: 'text/markdown' }));
  form.set(
    'metadata',
    JSON.stringify({
      content_id: document.key,
      locale: document.locale,
      content_hash: document.contentHash,
    }),
  );
  // A synchronous upload can exceed the HTTP timeout while waiting for vector ingestion.
  // Poll asynchronous jobs instead, also resuming an accepted job after an interrupted run.
  form.set('wait_for_completion', 'false');
  let item = current.get(document.key);
  if (
    item?.metadata?.content_hash !== document.contentHash ||
    !['queued', 'running', 'outdated'].includes(item.status)
  ) {
    item = (await request(`${base}/items`, { method: 'POST', body: form })).result;
  }
  submitted.set(document.key, { item, started });
  accepted += 1;
  if (accepted % 25 === 0 || accepted === release.documents.length) {
    console.log(
      `Accepted ${accepted}/${release.documents.length} documents; indexing verification follows.`,
    );
  }
});

// Submit the complete batch before polling so background ingestion can proceed together.
// Both phases settle all work before failing; no retrieval/deployment/prune can follow a failure.
// Cloudflare's queue took over ten minutes for a small batch during live verification.
// A shared deadline bounds the whole phase without expiring early items after five minutes.
const indexingDeadline = Date.now() + 15 * 60_000;
await runConcurrently(changed, 4, async (document) => {
  const submittedDocument = submitted.get(document.key);
  let item = submittedDocument.item;
  while (['queued', 'running', 'outdated'].includes(item.status) && Date.now() < indexingDeadline) {
    await pause(3000);
    item = (await request(`${base}/items/${encodeURIComponent(item.id)}`)).result;
  }
  if (
    item.status !== 'completed' ||
    !(item.chunks_count > 0) ||
    item.metadata?.content_hash !== document.contentHash
  ) {
    throw new Error(
      `Indexing did not complete with verified metadata for ${document.key}. Status: ${item.status}. Existing documents have not been pruned.`,
    );
  }
  completed += 1;
  console.log(
    `Indexed ${completed}/${release.documents.length}: ${document.key} (${item.chunks_count} chunks, ${Math.round((Date.now() - submittedDocument.started) / 1000)}s).`,
  );
});

// Both phases require live retrieval. Normal synchronization never deletes old evidence.
const check = await request(`${base}/search`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    query: 'Matias Suxo experience projects skills',
    ai_search_options: {
      retrieval: { retrieval_type: 'hybrid', max_num_results: 5 },
      cache: { enabled: false },
    },
  }),
});
const approvedHashes = new Map(
  release.documents.map((document) => [document.key, document.contentHash]),
);
if (
  !check.result.chunks?.some(
    (chunk) =>
      chunk.item && approvedHashes.get(chunk.item.key) === chunk.item.metadata?.content_hash,
  )
) {
  throw new Error(
    'Retrieval verification returned no approved current document. Existing documents have not been pruned.',
  );
}
if (prune) {
  await runConcurrently(removed, 4, async (item) => {
    await request(`${base}/items/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    console.log(`Removed stale managed document ${item.key}.`);
  });
  console.log(
    `Knowledge finalized: ${release.contentHash.slice(0, 12)}. Retrieval verified; ${removed.length} stale owned documents removed.`,
  );
} else {
  console.log(
    `Knowledge ready: ${release.contentHash.slice(0, 12)}. Retrieval verified; previous documents retained. Finalize with --prune only after this release is deployed.`,
  );
}
