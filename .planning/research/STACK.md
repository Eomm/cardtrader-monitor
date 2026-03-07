# Technology Stack

**Project:** CardTrader Monitor
**Researched:** 2026-03-07
**Confidence caveat:** Versions are based on training data through May 2025. All version numbers are marked for verification — run `npm view <package> version` to confirm latest before installing.

## Recommended Stack

### Core Framework (Frontend SPA)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | ^19.0.0 | UI framework | React 19 shipped Dec 2024 with Actions, use() hook, and improved Suspense. Stable and well-suited for a dashboard SPA. If 19 causes issues with any dependency, fall back to ^18.3.0. | MEDIUM — verify 19.x stability with Supabase SDK |
| Vite | ^6.0.0 | Build tooling | Vite 6 released late 2024. Fast dev server, native ESM, excellent React support via `@vitejs/plugin-react`. No reason to use anything else for an SPA. | MEDIUM — verify latest major |
| TypeScript | ^5.7.0 | Type safety | Non-negotiable for a project with multiple data models (cards, rules, snapshots). Catches API contract mismatches early. | HIGH — 5.x is stable line |
| React Router | ^7.0.0 | Client-side routing | React Router v7 released late 2024, merging Remix concepts. For a simple SPA on GitHub Pages, v7 works fine. Use `createHashRouter` (not `createBrowserRouter`) because GitHub Pages does not support server-side rewrites for clean URLs. | MEDIUM — verify v7 API stability |
| TanStack Query | ^5.0.0 | Server state management | v5 is the current stable line. Handles Supabase data fetching, caching, background refetching, and optimistic updates. Far better than manual useEffect+useState for API data. | HIGH — v5 is mature |
| Tailwind CSS | ^4.0.0 | Styling | Tailwind v4 released early 2025 with a new engine, CSS-first config, and zero-config detection. If v4 migration feels risky, pin to ^3.4.0 which is battle-tested. Recommendation: start with v4, it's the forward path. | MEDIUM — v4 is new, verify plugin ecosystem |
| @supabase/supabase-js | ^2.45.0 | Supabase client | The v2 SDK is the current stable line. Handles auth, database queries, and edge function invocation from the frontend. Do NOT use v1. | HIGH — v2 is stable and well-documented |

### Backend (Supabase Edge Functions)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Deno | Runtime (managed by Supabase) | Edge Function runtime | Not a choice — Supabase Edge Functions run on Deno. Use `Deno.serve()` pattern (not the old `serve()` import). | HIGH |
| supabase CLI | Latest | Local dev & deployment | `npx supabase` or global install. Required for `supabase functions serve` (local dev) and `supabase functions deploy`. | HIGH |
| oak or Hono | N/A | HTTP framework for Edge Functions | Do NOT use a framework. Supabase Edge Functions are single-endpoint. Use raw `Deno.serve()` with manual request parsing. Frameworks add unnecessary weight to cold starts. | HIGH — official Supabase guidance |

### Background Jobs (GitHub Actions)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js | 22 LTS | Job runtime | Node 22 is the active LTS line (entered LTS Oct 2024). Use `actions/setup-node@v4` with `node-version: '22'`. The design doc says 20, but 22 LTS is current and supported through April 2027. | HIGH |
| tsx | ^4.0.0 | TypeScript execution | Run `.ts` files directly without a build step. Simpler than setting up `tsc` + `node` for job scripts. Add as devDependency in `/jobs/package.json` with scripts like `"price-check": "tsx src/price-check.ts"`. | HIGH — widely adopted |
| @supabase/supabase-js | ^2.45.0 | Database access from jobs | Same SDK as frontend but using `createClient` with `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. | HIGH |

### Telegram Bot

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| grammY | ^1.30.0 | Telegram Bot API (GitHub Actions jobs) | Use grammY over Telegraf. grammY is actively maintained, has better TypeScript types, smaller bundle, and first-class Deno support (important if you later move notification logic to Edge Functions). Telegraf v4 works but has slower release cadence and weaker Deno story. | MEDIUM — verify latest minor |
| Telegram Bot API (raw fetch) | N/A | Telegram from Edge Functions | For the `telegram-webhook` Edge Function, use raw `fetch()` calls to the Telegram Bot API (`https://api.telegram.org/bot<token>/sendMessage`). Adding grammY to an Edge Function increases cold start time for what amounts to 2-3 API calls. | HIGH — simplicity wins |

### Dev Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | ^9.0.0 | Linting | ESLint 9 uses flat config (`eslint.config.js`). Use with `@eslint/js` and `typescript-eslint`. Do NOT use the old `.eslintrc` format. | HIGH |
| Prettier | ^3.4.0 | Code formatting | Standard formatter. Use with `prettier-plugin-tailwindcss` for automatic class sorting. | HIGH |
| vitest | ^2.0.0 | Testing | Vite-native test runner. Same config as your build tool. Use for unit tests on filter logic, rule evaluation, and API response parsing. | HIGH |

### GitHub Actions Workflows

| Action | Version | Purpose | Why | Confidence |
|--------|---------|---------|-----|------------|
| actions/checkout | v4 | Checkout code | Standard, no alternative needed. | HIGH |
| actions/setup-node | v4 | Setup Node.js | Use with `node-version: '22'` and `cache: 'npm'` for faster installs. | HIGH |
| peaceiris/actions-gh-pages | v4 | Deploy to GitHub Pages | The established action for GitHub Pages deployment. Alternatively, use the official `actions/deploy-pages` + `actions/upload-pages-artifact` combo if the repo uses the newer GitHub Pages deployment method (via Actions, not gh-pages branch). Recommend the official method — it's more reliable and doesn't require a `gh-pages` branch. | MEDIUM |

### Infrastructure

| Technology | Tier | Purpose | Why | Confidence |
|------------|------|---------|-----|------------|
| Supabase | Free | Database + Auth + Edge Functions | Already decided. Free tier (500 MB, 500K invocations) is sufficient for <200 users. | HIGH |
| GitHub Pages | Free | Frontend hosting | Already decided. Static SPA hosting with HTTPS. | HIGH |
| GitHub Actions | Free (public repo) | Cron jobs + CI/CD | Already decided. 2,000 min/month for public repos. | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Telegram bot lib | grammY | Telegraf v4 | Telegraf works but has weaker TypeScript types, no native Deno support, and slower maintenance cadence. grammY is the modern choice. |
| Telegram bot lib | grammY | node-telegram-bot-api | Outdated API design, no TypeScript-first approach, callback-based. |
| CSS framework | Tailwind CSS v4 | shadcn/ui + Tailwind | shadcn/ui is excellent but overkill for a dashboard with ~5 pages. Raw Tailwind is faster to ship. If you want pre-built components later, add shadcn/ui incrementally — it's not a library, it's copy-paste components. |
| State management | TanStack Query | Zustand / Redux | This app's state is almost entirely server state (cards, prices, rules). TanStack Query handles that natively. No need for a separate client-state library. If you need tiny bits of client state (UI toggles), use React's built-in useState/useContext. |
| TS runner (jobs) | tsx | ts-node | ts-node requires more config, slower startup. tsx uses esbuild under the hood, zero config. |
| Test runner | Vitest | Jest | Jest works but requires separate config. Vitest shares Vite config, faster, better ESM support. |
| Router | React Router v7 | TanStack Router | TanStack Router is excellent but has a steeper learning curve and is overkill for 5 routes. React Router v7 is the safer, more documented choice. |
| Build tool | Vite | Turbopack / Rspack | Vite is the standard for React SPAs. Turbopack is Next.js-focused. Rspack is promising but less ecosystem support. |
| Node.js version | 22 LTS | 20 LTS | Node 20 LTS enters maintenance April 2025 and EOL April 2026. Node 22 is the active LTS with support through April 2027. |
| GH Pages deploy | actions/deploy-pages | peaceiris/actions-gh-pages | The official GitHub method (actions/deploy-pages) is better maintained and doesn't need a separate gh-pages branch. The peaceiris action is popular but third-party. |

## Key Architecture Notes

### GitHub Pages SPA Routing

GitHub Pages serves static files. It does NOT support server-side URL rewriting. This means:
- `https://user.github.io/cardtrader-monitor/dashboard` will 404 on page refresh
- **Solution:** Use `createHashRouter` from React Router. URLs become `/#/dashboard`, `/#/cards/123`, etc. Hash-based routing works without server config.
- **Alternative:** Add a `404.html` that redirects to `index.html` with the path encoded as a query param. This is hacky. Use hash routing instead.

### Supabase Edge Functions: Deno Patterns

Edge Functions use Deno, not Node.js. Key differences:
- Import from URLs or import maps, not `node_modules`
- Use `Deno.serve()` handler pattern
- Access environment variables via `Deno.env.get('KEY')`
- Supabase provides `supabase-js` as a pre-loaded module
- CORS headers must be handled manually (add `Access-Control-Allow-Origin` headers)

```typescript
// Pattern for Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ... function logic

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
```

### GitHub Actions Cron Best Practices

- Cron schedules in GitHub Actions are NOT guaranteed to run exactly on time. Delays of 5-15 minutes are common during high-load periods.
- Add `workflow_dispatch` trigger to every cron workflow for manual testing.
- Use `actions/setup-node@v4` with `cache: 'npm'` to speed up installs (saves ~30s per run, which matters at 24 runs/day).
- Set `timeout-minutes: 10` on the job to prevent runaway executions eating your minutes quota.
- Use `concurrency` to prevent overlapping runs:

```yaml
concurrency:
  group: price-check
  cancel-in-progress: false  # Let running job finish, skip new trigger
```

### Monorepo Structure

The project has two separate Node.js contexts (frontend SPA + jobs scripts). Recommended structure:

```
/
  /src              # React SPA source
  /public           # Static assets
  /supabase
    /functions      # Edge Functions (Deno)
    /migrations     # Database migrations
  /jobs
    /src            # GitHub Actions job scripts (Node.js + tsx)
    package.json    # Separate dependencies
    tsconfig.json
  package.json      # Frontend dependencies
  vite.config.ts
  tailwind.config.ts (or CSS-based config for v4)
  tsconfig.json
```

Keep `/jobs` as a separate package.json. The jobs need `@supabase/supabase-js` and `grammy`, but NOT React, Vite, or Tailwind. Separate dependency trees keep installs fast in GitHub Actions (jobs only install their own deps).

## Installation

```bash
# Frontend (root)
npm install react react-dom @supabase/supabase-js @tanstack/react-query react-router
npm install -D typescript @types/react @types/react-dom vite @vitejs/plugin-react tailwindcss eslint prettier vitest

# Jobs (/jobs directory)
cd jobs
npm install @supabase/supabase-js grammy
npm install -D typescript tsx @types/node
```

## Version Verification Checklist

**IMPORTANT:** All versions listed are based on training data through May 2025. Before initializing the project, verify each version:

```bash
# Run these to get current latest versions
npm view react version
npm view vite version
npm view @supabase/supabase-js version
npm view @tanstack/react-query version
npm view tailwindcss version
npm view react-router version
npm view grammy version
npm view typescript version
npm view tsx version
npm view vitest version
npm view eslint version
```

Specific versions to double-check:
- [ ] React 19 — Was stable by Dec 2024, but verify ecosystem compatibility
- [ ] Tailwind CSS v4 — Released early 2025, verify plugin maturity
- [ ] React Router v7 — Verify hash router API (`createHashRouter`)
- [ ] grammY — Verify latest minor version
- [ ] Vite — May have released v7 by March 2026

## Sources

- React 19 release: Official React blog (Dec 2024) — HIGH confidence
- Vite 6 release: Vite changelog — MEDIUM confidence (may be v7 by now)
- Tailwind CSS v4: Official Tailwind blog (early 2025) — MEDIUM confidence
- Supabase Edge Functions patterns: Supabase documentation — HIGH confidence
- grammY vs Telegraf: npm download trends and GitHub activity — MEDIUM confidence
- GitHub Actions cron behavior: GitHub documentation — HIGH confidence
- Node.js 22 LTS: Node.js release schedule — HIGH confidence
