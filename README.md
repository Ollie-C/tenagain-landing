# tenagain landing site

Last verified against source: 21 October 2026 (Asia/Tokyo); provider acceptance remains pending.

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
| `node --test scripts/ops01/*.test.mjs` | Test staging identity and build provenance guards offline using synthetic responses and isolated Git fixtures |

## Deployment

The site is fully static and requires no runtime secrets. CI/deploy credentials stay in GitHub environments, never `PUBLIC_*` values or the built site. `PUBLIC_RELEASE_SHA` (fallback `CF_PAGES_COMMIT_SHA`, otherwise `local`) is embedded in `dist/api/release`; the deployed `/api/release` must report the exact full candidate SHA. This identity endpoint is not an application/DB health check.

The build may download Google font assets through Astro. There is no package-level `test` or `lint` script; CI runs the focused Node staging-guard tests and the Astro build. Generated `.astro`/`dist` output is tracked in this repository, so build in an isolated checkout and review generated churn separately.

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
| `CLOUDFLARE_API_TOKEN` | Secret | Cloudflare token authorized to read this Pages project/deployment metadata and deploy it |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Account containing that project |
| `CLOUDFLARE_PAGES_PROJECT` | Variable | `tenagain-landing`, the reviewed Direct Upload project |
| `STAGING_PAGES_PROJECT_ID` | Variable | `7b1de655-9592-4dc5-bcbf-0c5c89fa13bd`, independently verified in the 21 October owner identity receipt; setting the variable remains an owner action |

Credentials in the frontend repository are not automatically available here. The workflow accepts successful CI from a `main` push in this repository, checks out its exact SHA without persisting Git credentials, and checks the project through the configured CI credential before installing/building. It requires the pinned project ID, name, Pages subdomain, production branch `main` and no Git source. Missing/unexpected metadata fails closed before upload. Supplying the new project-ID variable and any credential qualification are separate owner actions; this source change performs neither.

The build starts from a verified clean checkout of the tested SHA. Application dependencies use the frozen pnpm lock. Wrangler **3.90.0**, the pinned action's existing default, is prepared separately under runner temp and linked through ignored `node_modules` paths. The action explicitly uses npm to resolve that installed version, avoiding its automatic `pnpm add wrangler` path changing application package/lock files. No application dependency upgrade is introduced.

After installation/build, changes must be confined to generated `.astro/` and `dist/` paths; source edits, new source files or moves from source into output fail before upload. A provenance file outside the checkout records the source tree, generated paths, expected dirty flag and SHA-256 of a sorted file/hash manifest covering `dist` (symlinks rejected). The artifact hash is rechecked after upload. This is source/build evidence, not an independent download/hash of Cloudflare's deployed bundle.

The upload uses branch `staging`. Its exact deployment ID/URL are then checked against provider preview/branch/SHA/success metadata and saved as the allowlisted `landing-staging-provider-receipt` artifact (14 days). Cloudflare's actual dirty flag must match the locally verified generated-only state; it is retained truthfully alongside source tree and build hash, never overridden with `--commit-dirty=false`. A missing/inconsistent provenance file fails closed. Wrangler's own untracked `.wrangler/` cache is allowed only during the post-upload check; it cannot justify source changes during install/build. The older 21 October upload has no such build provenance and remains separately qualified evidence.

Raw API responses, account ID, token and provider environment values are not saved by these checks. Controlled validation reasons may be logged; raw provider/filesystem/process errors remain withheld. Missing action outputs, denied API reads or unexpected provider response shapes fail the workflow; an upload may already exist when a post-upload check fails. Inspect that exact deployment before deciding on a new run.

A provider receipt does not establish hosted acceptance. Using the protected member session, verify `/api/release` at the receipt's immutable deployment URL reports `status: ok` and the same full SHA, then record URL/ID, timestamp and result in the private operations evidence. Keep preview Access protection in place; the script does not request the protected site or acquire Access credentials. The production workflow remains a separate manual promotion path. These local workflow checks have mocked evidence only until separately authorized integration and staging execution.

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
