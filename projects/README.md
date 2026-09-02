# Projects

This directory contains standalone frontend applications that are published under `samaita.com/projects`.

Each project is developed independently using Vite, but deployed together with the Hugo blog through a single Cloudflare Pages pipeline.

## URL Convention

```
https://samaita.com/projects/<project-name>/
```

Examples:

```
https://samaita.com/projects/address-quality/
https://samaita.com/projects/json-diff/
https://samaita.com/projects/api-monitor/
```

---

## Directory Structure

```
projects/
├── README.md
├── address-quality/
├── json-diff/
└── api-monitor/
```

Each project is a standalone Vite application.

Example:

```
address-quality/
├── src/
├── public/
├── package.json
├── vite.config.ts
└── ...
```

---

## Creating a New Project

### 1. Create a new Vite project

```
projects/my-project/
```

### 2. Configure `vite.config.ts`

```ts
export default defineConfig({
    base: "/projects/my-project/",

    build: {
        outDir: "../../static/projects/my-project",
        emptyOutDir: true,
    },
})
```

The `base` must match the production URL.

The `outDir` publishes the generated files into Hugo's `static` directory.

---

### 3. Build

```
npm run build
```

The generated files should appear in:

```
static/projects/my-project/
```

---

### 4. Verify with Hugo

```
hugo server
```

Open:

```
http://localhost:1313/projects/my-project/
```

If you are testing through Cloudflare Pages preview or a temporary Cloudflare Tunnel, set `HUGO_BASEURL` to the public URL first so absolute links do not point at `localhost`.

For a temporary tunnel run, use `scripts/cloudflare-preview.sh`; it discovers the tunnel URL, rebuilds the site with that URL as the base, and serves the result through the tunnel.

---

## Deployment

No additional deployment configuration is required.

Cloudflare Pages builds the entire repository.

Deployment flow:

```
Vite Build
        │
        ▼
static/projects/<project>
        │
        ▼
Hugo Build
        │
        ▼
public/
        │
        ▼
Cloudflare Pages
```

---

## Rules

- Every project must be independently buildable.
- Every project must use Vite.
- Every project must set `base` to `/projects/<project-name>/`.
- Every project must output to `../../static/projects/<project-name>`.
- Do not commit `node_modules`.
- Do not edit files inside `static/projects/`; they are generated artifacts.
- Projects should remain decoupled from the Hugo theme whenever possible.

---

## Why This Architecture?

This repository uses a monorepo approach:

- One Git repository
- One Cloudflare Pages deployment
- One Hugo site
- Multiple standalone frontend applications

This keeps deployment simple while allowing each project to evolve independently.

## Environment Variables

Each project manages its own environment variables.

Example:

```
projects/
└── address-quality/
    ├── .env
    └── .env.example
```

Only variables prefixed with `AQ_` are exposed to the frontend.

Example:

```env
AQ_API_URL=https://api.samaita.com/address-quality
AQ_PUBLIC_API_KEY=pk_live_xxxxxxxxx
```

The API key is **public** and intended only for browser-based playground access.

Do not place private credentials or secrets inside `.env`, as they are embedded into the final JavaScript bundle.