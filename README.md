# MyVu landing site

Static Astro marketing site for `https://myvu.app`. It links into the SvelteKit application at `https://app.myvu.app`.

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

- Canonical site URL: `https://myvu.app`
- App URL: `https://app.myvu.app`
- Build command: `pnpm build`
- Output directory: `dist`
- CI: `.github/workflows/ci.yml` builds on pushes to `main` and pull requests

The canonical URLs are defined in `astro.config.mjs` and `src/config.ts`. Verify DNS and hosting status before launch; checked-in URLs describe intended configuration, not live availability.

Shared workspace setup and deployment notes live in `../docs/`.
