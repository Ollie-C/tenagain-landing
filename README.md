# tenagain landing site

Static Astro marketing site for `https://tenagain.app`. It links into the SvelteKit application at `https://app.tenagain.app`.

## Local development

Requires Node.js 24 and pnpm 10.30.3.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:4321`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Astro development server |
| `pnpm build` | Build the static site to `dist/` |
| `pnpm preview` | Preview the production build |

## Deployment

The site is fully static and requires no runtime secrets.

- Canonical site URL: `https://tenagain.app`
- App URL: `https://app.tenagain.app`
- Build command: `pnpm build`
- Output directory: `dist`
- CI: `.github/workflows/ci.yml` builds on pushes to `main` and pull requests

The canonical URLs are defined in `astro.config.mjs` and `src/config.ts`. Verify DNS and hosting status before launch; checked-in URLs describe intended configuration, not live availability.

Shared workspace setup and deployment notes live in `../docs/`.

## Landing views

Score preserves the cinematic rating flow. Monthly shows the app's competition widget after explicit entry; chevrons and a labeled live-event button connect the two views. Use `/?view=weekly&competition=<slug>` for a competition deep link. A credential-free availability request runs before iframe entry and does not create a guest. Score controls remain usable when the optional WebGL effect fails; inactive images load when selected.

Configure `PUBLIC_APP_URL` for the app. The app's `PUBLIC_LANDING_URL` must match this landing origin, and both production sites should share the HTTPS registrable domain so app-domain session cookies work inside the widget. Backend voting/Turnstile setup is documented in `../docs/architecture/weekly-competitions.md`.
