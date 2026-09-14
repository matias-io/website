# Matias Suxo

Professional portfolio at [matiass.ca](https://matiass.ca/). Next.js, React and TypeScript, exported as static pages and served by a Cloudflare Worker. English, French and Spanish share the same URLs. The profile stays mounted while detail routes change.

```text
src/content + approved notes → knowledge build → AI Search
Next.js → out/ → Cloudflare static assets
/api/* → Worker → Turnstile → AI guide or contact email
```

## Run locally

Use Node.js 24 and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://localhost:3300`. For APIs, copy `.dev.vars.example` to `.dev.vars`, build once, then start the Worker in another terminal:

```sh
npm run build
npm run preview
```

The Worker runs at `http://localhost:3301`; Next proxies `/api/*` there during development. Chat and contact report unavailable until configured. Remote AI bindings use real Cloudflare services. Keep `.dev.vars` out of Git and use development Turnstile keys only for local tests.

On Windows, stop the Worker preview before rebuilding. Its file watcher can lock `out/` while Next replaces the export. Restart the preview after the build finishes.

| Command                     | Purpose                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `npm run check`             | Generate knowledge, check formatting, lint, typecheck both apps and run tests |
| `npm run format`            | Format source files                                                           |
| `npm run build`             | Generate knowledge and export all page routes                                 |
| `npm run preview`           | Serve the export and Worker APIs on port 3301                                 |
| `npm run knowledge:preview` | Rebuild knowledge and preview synchronization without changes                 |
| `npm run deploy`            | Build, upload knowledge, deploy, then prune stale knowledge                   |

## Change the site

| Location                      | What belongs here                                                           |
| ----------------------------- | --------------------------------------------------------------------------- |
| `src/content/{en,fr,es}.json` | Profile, experience, projects and skills; keep IDs aligned across languages |
| `src/i18n/`                   | Interface labels and language preference                                    |
| `src/app/`                    | Routes, metadata and global styles                                          |
| `src/features/`               | Portfolio, console animation, audio, assistant and contact components       |
| `src/styles/tokens.css`       | Shared visual tokens                                                        |
| `src/worker/`                 | Chat/contact validation, retrieval and delivery                             |
| `src/shared/chat.ts`          | Browser/Worker request and response types                                   |
| `public/`                     | Images, icons and static assets                                             |

Content IDs become routes such as `/projects/altura/` and `/experience/uottawa-ai/`. Add the same ID to every translation. Use documented facts and accurate dates. The locale preference is saved in the browser; sound is opt-in and motion respects reduced-motion settings.

The build's `postbuild` step creates flat aliases for Next's nested RSC prefetch files. Keep this step when changing deployment tooling so Cloudflare can serve client navigation from static assets.

## Knowledge for the AI guide

Site content is indexed automatically. To add approved background that has no public page, create `content/knowledge/<name>.json`:

```json
{
  "id": "languages",
  "title": "Languages and current study",
  "locale": "en",
  "text": "A statement Matias approved for public answers.",
  "visibility": "reference-only",
  "approvedForPublicAnswers": true
}
```

Only the exact approval flag and visibility above allow indexing. These notes can be disclosed in public AI answers and are readable in this public repository. Do not put confidential material here. Notes appear as named sources without links; page sources open the relevant route. Other repository files are not indexed.

The build writes ignored Markdown to `.local/knowledge/` and a trusted citation manifest to `src/worker/generated/manifest.json`. Sync uploads changed files, waits for indexing and verifies retrieval while retaining previous documents. After successful Worker deployment, `knowledge:prune` removes stale files owned by this project. A failed deployment leaves the previous generation's evidence available. Content hashes prevent an older source from supporting a changed page. Keep the generated manifest with the release.

```sh
npm run knowledge:preview
# After setting AI_SEARCH_API_TOKEN in the environment:
npm run knowledge:sync
# Only after this exact build has deployed successfully:
npm run knowledge:prune
# First-time instance creation, after knowledge:build:
node scripts/knowledge-sync.mjs --create
```

Without credentials, preview checks the local release only. Prune never uploads; it refuses an incomplete release and protects against removing more than half the managed files without an explicit override. Do not rebuild or change content between deployment and prune. Use direct Node commands for flags on Windows; the PowerShell npm shim can drop forwarded flags. For embedding or chunking changes, populate a new instance and update the Wrangler binding after verification.

## Cloudflare and deployment

`wrangler.jsonc` defines the account, Worker, static assets and bindings. Provision AI Search `matiass-public` in the `default` namespace, AI Gateway `matiass-assistant`, a Turnstile widget and email routing/sending for the domain. Instance creation via the sync script configures multilingual BGE-M3 hybrid retrieval and required metadata. Disable AI Search public endpoints, including namespace access to this instance, so requests pass through the site's checks. Configure a blocking budget in AI Gateway before enabling chat.

| Setting                                                     | Storage                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `TURNSTILE_SITE_KEY`, `ALLOWED_HOSTNAMES`, `AI_GATEWAY_ID`  | Wrangler variables                                         |
| `TURNSTILE_SECRET_KEY`, `CONTACT_FROM`, `CONTACT_RECIPIENT` | Worker secrets; never browser variables                    |
| `CHAT_ENABLED`, `CONTACT_ENABLED`                           | Wrangler variables; enable after configuration is verified |
| `AI`, `KNOWLEDGE`, `CONTACT_EMAIL`, both rate limiters      | Wrangler bindings                                          |

Set Worker secrets with `npx wrangler secret put <NAME>`. The contact recipient must be verified in Cloudflare; it is never returned by the API. Contact success means the email service accepted the message, not confirmed inbox delivery. Turnstile requires a fresh token per send with action `portfolio-chat` or `portfolio-contact`.

GitHub Actions checks pull requests and `main` pushes. Production deployment is disabled unless the repository Actions variable `PRODUCTION_DEPLOY_ENABLED` is exactly `true`. When it is unset or false, both push-triggered and manually requested deployments are skipped; a skipped workflow does not mean a site was deployed.

Enable that variable only after confirming the domain's Cloudflare account, provisioning the required resources and setting the following secrets in the GitHub `production` environment:

- `CLOUDFLARE_API_TOKEN`: account-scoped Worker deployment token with Workers Scripts Edit. Add Zone Read when Wrangler resolves a zone; Workers Routes Edit is needed for URL-pattern routes, not the custom-domain attachment API.
- `AI_SEARCH_API_TOKEN`: account-scoped AI Search Edit and AI Search Run permissions.

Once enabled, `main` releases run in order: checks, export, knowledge upload and verification, Worker deployment, knowledge pruning. Missing credentials then fail deployment explicitly. Keep Cloudflare's automatic Git build off while GitHub owns deployment. Local Wrangler OAuth is separate from CI tokens; an older login may need renewal for AI Search scopes. See [Worker deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) and [AI Search authentication](https://developers.cloudflare.com/ai-search/api/instances/rest-api/).

Before release, check direct route refreshes, back navigation, all three languages, keyboard navigation, reduced motion and real sourced AI answers. Unit tests cover request limits, verification gates, source integrity and contact validation. `AGENTS.md`, `docs/` and `.local/` remain local working files; this README is the developer guide kept in Git.
