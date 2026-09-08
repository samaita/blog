# Address Quality Frontend

This directory contains the frontend for the Address Quality project, including the landing page, documentation site, and interactive API playground.

Unlike the backend, which contains the core address validation engine, this application focuses on providing a clean developer experience for exploring and integrating the API.

---

## Development Philosophy

The frontend is intentionally developed using an **AI-assisted ("vibe coding") workflow**.

Address Quality is fundamentally a backend and infrastructure project. Instead of investing significant time building frontend components from scratch, the UI is rapidly prototyped using modern AI coding assistants and then manually reviewed, refined, and integrated into the project.

Every generated change is reviewed before being committed. AI is used to accelerate implementation—not to replace engineering judgment.

This allows development effort to remain focused on the parts of the project that provide the most value:

- Indonesian address parsing
- Administrative hierarchy validation
- Candidate resolution
- Confidence scoring
- Explainable validation evidence

If you're a frontend engineer and notice opportunities to improve the codebase, contributions are always welcome.

---

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Kumo UI

---

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

## Project Goals

The frontend aims to provide:

- A modern landing page
- Comprehensive API documentation
- Interactive API playground
- Responsive developer experience
- Clean and maintainable UI components

It is intentionally lightweight so the majority of development effort can remain focused on the Address Quality API and its validation engine.

---

## Local Development Cache Behavior

The Address Demo dropdown is backed by [PGlite](https://pglite.dev) (Postgres in WASM) running entirely in the browser:

- `src/services/adminDb.ts` lazily initializes a singleton in-memory `PGlite` instance, creates the `provinces` / `cities` / `districts` tables, and seeds them from `public/wilayah-seed.json` (~200KB Kemendagri data).
- The seed file's province→city relation is keyed by province **name**, not code — the upstream dump gives Papua Barat and Papua Barat Daya the same `"92"` prefix, so codes are not unique.
- At runtime the browser downloads ~16MB of hashed PGlite artifacts: `assets/pglite-*.wasm` (~9.6MB), `assets/pglite-*.data` (~6MB), and `assets/initdb-*.wasm` (~386KB).

### Gotcha: stale dropdown on localhost

`hugo server` (the `make dev` flow, `localhost:1313`) sends **no `Cache-Control` header** by default. A normal browser tab then heuristic-caches the PGlite wasm/data artifacts and `wilayah-seed.json`, so a rebuilt project can serve stale data to the address dropdown — an incognito/private window (empty cache) always loads fresh, which makes the bug look intermittent.

Fix: the repo `Makefile` `dev` target runs `hugo server --noHTTPCache`, which sends `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` on every response. Restart `make dev` after changing this.

Production is unaffected: Cloudflare Pages serves hashed filenames (instant cache invalidation) and `nginx.conf.template` already sets explicit cache headers (`assets/` → `public, immutable`; `index.html` → `no-cache, must-revalidate`).