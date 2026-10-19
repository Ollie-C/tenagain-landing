# tenagain landing site

Last verified against source: 19 October 2026 (Asia/Tokyo); provider acceptance remains pending.

Static Astro marketing site for `https://tenagain.app`. It links into the SvelteKit application at `https://app.tenagain.app`.

## Local development

Requires **Node.js 24** (CI) and **pnpm 10.30.3** (`packageManager`). Install the exact pnpm version with `npm install --global pnpm@10.30.3` if needed. Dependency ranges are in `package.json`, exact resolutions in `pnpm-lock.yaml`; use frozen installation without updates.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Open `http://localhost:4321`. Development defaults to the app at `http://localhost:5173`; production builds default to `https://app.tenagain.app`. `PUBLIC_APP_URL` overrides either at build time. The copied local `.env` therefore also affects local production builds; unset/remove that local override when verifying production defaults.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Astro development server |
| `pnpm build` | Build the static site to `dist/` |
| `pnpm preview` | Preview the production build |

## Deployment

The site is fully static and requires no runtime secrets. CI/deploy credentials stay in GitHub environments, never `PUBLIC_*` values or the built site. `PUBLIC_RELEASE_SHA` (fallback `CF_PAGES_COMMIT_SHA`, otherwise `local`) is embedded in `dist/api/release`; the deployed `/api/release` must report the exact full candidate SHA. This identity endpoint is not an application/DB health check.

The build may download Google font assets through Astro. `pnpm run build` is the only checked-in quality script; this repository has no `test` or `lint` script. Generated `.astro`/`dist` output is tracked in this repository, so build in an isolated checkout and review generated churn separately.

- Canonical site URL: `https://tenagain.app`
- App URL: `https://app.tenagain.app`
- Build command: `pnpm build`
- Output directory: `dist`
- CI: `.github/workflows/ci.yml` builds on pushes to `main` and pull requests

The canonical URLs are defined in `astro.config.mjs` and `src/config.ts`. Verify DNS and hosting status before launch; checked-in URLs describe intended configuration, not live availability.

Shared setup requires the private docs clone described below.

## Landing views

Score preserves the cinematic rating flow. Monthly shows the app's competition widget after explicit entry; chevrons and a labeled live-event button connect the two views. Use `/?view=weekly&competition=<slug>` for a competition deep link. A credential-free availability request runs before iframe entry and does not create a guest. Score controls remain usable when the optional WebGL effect fails; inactive images load when selected.

Configure `PUBLIC_APP_URL` for the app. The app's `PUBLIC_LANDING_URL` must match this landing origin, and both production sites should share the HTTPS registrable domain so app-domain session cookies work inside the widget. Backend voting/Turnstile setup is documented in `../docs/architecture/weekly-competitions.md`.

## GitHub staging deployment configuration

The `Deploy staging` workflow uses this repository's GitHub **staging** environment. Configure these under Settings → Environments → staging (or as repository settings available to the workflow):

| Setting | Kind | Value |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Cloudflare token authorized to deploy the Pages project |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Account containing that project |
| `CLOUDFLARE_PAGES_PROJECT` | Variable | Existing Pages project name |

Credentials in the frontend repository are not automatically available here. The workflow validates these names before installing/building; it never prints their values. The checked-in workflow deploys successful `main` CI commits to the stable `staging` preview; the production workflow manually promotes a selected commit. These files do not prove current Pages project/account identity, credentials or live deployment access; those remain operator gates.

## Standalone clone and private documentation

The static landing site can build alone; backend/AI are optional for full-stack testing. The application repositories and private `docs` repository are separate clones. They are not submodules and are not downloaded by package installation. Obtain the authorized clone URLs and access from Ollie; repository ownership/URLs remain pending GIT-01. Do not infer a new organization URL or put access tokens in clone URLs.

For the full local application stack, clone missing backend/AI siblings; building this repository alone does not fetch them. From this repository's root, use owner-supplied URLs (skip existing directories):

```sh
git clone "${BACKEND_REPOSITORY_URL:?Set the authorized backend repository URL}" ../tenagain-backend
git clone "${AI_REPOSITORY_URL:?Set the authorized AI repository URL}" ../tenagain-microservice
git clone "${DOCS_REPOSITORY_URL:?Set the authorized private docs URL}" ../docs
```

Keep the directory names `tenagain-microservice` and `docs`. Backend Compose resolves its AI build context relative to the backend directory. With a backend worktree, place an AI worktree at its sibling `tenagain-microservice` path too; a checkout elsewhere does not satisfy that path.

After cloning docs, open `../docs/README.md` and `../docs/getting-started/local-development.md`. These are local workspace paths, not public documentation URLs. The private docs clone supplies the source hierarchy, operational runbooks and `operations/pre-beta-release-checklist.md`, the final beta acceptance source. A repository README alone does not certify provider configuration or release readiness.
