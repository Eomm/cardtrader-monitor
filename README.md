# CardTrader Monitor

Get notified when trading card prices move on CardTrader -- so you can act on deals without constantly checking.

## What it does

- Import wishlists from CardTrader and track card prices
- Set per-card notification rules: threshold alerts (price drops/rises X%) and fixed price alerts (price crosses a target)
- Receive Telegram notifications when rules trigger
- Hourly price checks and daily wishlist sync via GitHub Actions
- Web dashboard to view cards, prices, and manage rules

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, deployed to GitHub Pages
- **Backend:** Supabase (Postgres, Edge Functions, Auth with Google OAuth)
- **Background jobs:** GitHub Actions (`fetch-prices` hourly, `sync-wishlists` daily, `cleanup-snapshots` daily)
- **Notifications:** Telegram Bot API
- **Linting:** Biome

## Architecture

The frontend is a static SPA hosted on GitHub Pages that talks directly to Supabase for data and auth. Supabase Edge Functions (Deno runtime) handle CardTrader API calls that require server-side execution: `import-wishlist`, `send-test-message`, and `telegram-webhook`. Scheduled work runs through GitHub Actions scripts (`scripts/fetch-prices.ts`, `scripts/sync-wishlists.ts`, `scripts/cleanup-snapshots.ts`) using the Supabase service role key. Everything runs on free tiers: Supabase free plan, GitHub Pages, and GitHub Actions (2,000 min/month).

## Prerequisites

- Node.js (for frontend dev and running scripts locally)
- Supabase CLI (`supabase`)
- A Supabase project (free tier works)
- A CardTrader account and API token
- A Telegram bot (create one via @BotFather)

## Getting Started

1. Clone the repo and install dependencies:
   ```
   git clone https://github.com/your-username/cardtrader-monitor.git
   cd cardtrader-monitor
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key:
   ```
   cp .env.example .env
   ```

3. Apply database migrations:
   ```
   npm run db:push
   ```

4. Deploy Supabase Edge Functions:
   ```
   npm run functions:deploy
   ```

5. In the Supabase dashboard, go to **Settings > API** and set **Verify JWT with legacy secret** to **false** -- this is required for Edge Functions to work correctly.

6. Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):
   - `SUPABASE_URL` -- your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` -- your Supabase service role key
   - `CARDTRADER_API_TOKEN` -- your CardTrader API token
   - `TELEGRAM_BOT_TOKEN` -- your Telegram bot token

7. Start the dev server:
   ```
   npm run dev
   ```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run check` | Run Biome linter |
| `npm run test` | Run tests |
| `npm run db:push` | Push DB migrations to Supabase |
| `npm run functions:deploy` | Deploy Supabase Edge Functions |
| `npm run functions:serve` | Serve Edge Functions locally |

## GitHub Actions Workflows

| Workflow | Schedule | What it does |
|---|---|---|
| `fetch-prices` | Hourly | Fetches current prices, evaluates notification rules, sends Telegram alerts |
| `sync-wishlists` | Daily | Re-syncs wishlists from CardTrader (metadata updates, removed card cleanup) |
| `cleanup-snapshots` | Daily at 04:00 UTC | Removes price snapshots older than the retention window |
| `deploy` | On push to main | Builds and deploys frontend to GitHub Pages |
| `ci` | On push/PR | Runs lint, type check, and tests |

## License

MIT
