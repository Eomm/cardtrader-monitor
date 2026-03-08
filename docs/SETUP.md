# CardTrader Monitor - Setup Guide

A complete guide to set up the project from scratch, including all external service configurations.

## Prerequisites

- **Node.js** (latest LTS recommended)
- **Supabase CLI** (`npm install -g supabase`)
- **Supabase account** (free tier works)
- **CardTrader account** with API token
- **Telegram Bot** (created via [@BotFather](https://t.me/BotFather))
- **GitHub account** (for GitHub Pages deployment and GitHub Actions)
- **Google Cloud Console** account (for OAuth)

## Local Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-username>/cardtrader-monitor.git
   cd cardtrader-monitor
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your environment file by copying the example:

   ```bash
   cp .env.example .env
   ```

4. Fill in the required environment variables in `.env`:

   | Variable | Description |
   |----------|-------------|
   | `VITE_SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxxx.supabase.co`) |
   | `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon/public key |
   | `SUPABASE_URL` | Same Supabase URL (used by scripts and Edge Functions) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for server-side operations) |
   | `ENCRYPTION_KEY` | A secret key used for CardTrader token encryption |
   | `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |

   You can find `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` in your Supabase Dashboard under **Settings > API**.

   The `SUPABASE_SERVICE_ROLE_KEY` is also in **Settings > API** under "service_role" (keep it secret).

5. Start the local development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173/cardtrader-monitor/`.

## Supabase Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com).

2. **Link your local project** to Supabase:

   ```bash
   supabase link --project-ref <your-project-ref>
   ```

3. **Run database migrations** to set up the schema:

   ```bash
   npm run db:push
   ```

   Alternatively, you can paste the SQL from `supabase/migrations/` files directly into the Supabase SQL Editor.

4. **Deploy Edge Functions:**

   ```bash
   npm run functions:deploy
   ```

   This deploys three Edge Functions:
   - `import-wishlist` - Imports cards from a CardTrader wishlist
   - `telegram-webhook` - Handles incoming Telegram messages
   - `send-test-message` - Sends a test notification to verify Telegram setup

5. **Important:** In the Supabase Dashboard, go to **Edge Functions** and set each function to **NOT** verify JWT with the legacy secret. This is required for the functions to work correctly.

## Google OAuth Configuration

CardTrader Monitor uses Google OAuth via Supabase for authentication.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or select an existing one).

2. Navigate to **APIs & Services > Credentials**.

3. Click **Create Credentials > OAuth 2.0 Client ID**.
   - Application type: **Web application**
   - Name: `CardTrader Monitor` (or any name you prefer)

4. Add the following **Authorized redirect URI**:

   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```

5. Copy the **Client ID** and **Client Secret**.

6. In the **Supabase Dashboard**, go to **Authentication > Providers > Google**:
   - Enable the Google provider
   - Paste the Client ID and Client Secret

7. Still in the Supabase Dashboard under **Authentication > URL Configuration**:
   - Set **Site URL** to your deployed URL (e.g., `https://<username>.github.io/cardtrader-monitor`)
   - Add **Redirect URLs** for local development:
     - `http://localhost:5173/cardtrader-monitor/dashboard`

## Telegram Bot Setup

1. Open Telegram and message [@BotFather](https://t.me/BotFather).

2. Send `/newbot` and follow the prompts to create your bot.

3. Copy the bot token and set it as `TELEGRAM_BOT_TOKEN` in your `.env` file.

4. Set the webhook URL so your bot receives messages. After deploying Edge Functions, run:

   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<SUPABASE_URL>/functions/v1/telegram-webhook"
   ```

   Replace `<YOUR_BOT_TOKEN>` and `<SUPABASE_URL>` with your actual values.

   The `npm run functions:deploy` script does this automatically if your `.env` is configured.

## GitHub Actions Setup

The project uses several GitHub Actions workflows for CI/CD and scheduled tasks.

### Repository Secrets

Go to your repository **Settings > Secrets and variables > Actions** and add:

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `VITE_SUPABASE_URL` | Supabase URL (for the frontend build) |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon key (for the frontend build) |

### Enable GitHub Pages

1. Go to **Settings > Pages**.
2. Set **Source** to **GitHub Actions**.

### Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **CI** (`ci.yml`) | Push to `main` | Runs Biome lint checks |
| **Deploy** (`deploy.yml`) | Push to `main` | Builds and deploys the app to GitHub Pages |
| **Fetch Prices** (`fetch-prices.yml`) | Hourly (cron `0 * * * *`) | Fetches current marketplace prices for monitored cards |
| **Sync Wishlists** (`sync-wishlists.yml`) | Daily at 06:00 UTC | Syncs wishlist metadata and card data from CardTrader |
| **Cleanup Snapshots** (`cleanup-snapshots.yml`) | Daily at 04:00 UTC | Removes old price snapshots to keep the database lean |

## Available npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start the Vite dev server |
| `build` | `npm run build` | Type-check and build for production |
| `check` | `npm run check` | Run Biome linting |
| `check:fix` | `npm run check:fix` | Run Biome linting with auto-fix |
| `preview` | `npm run preview` | Preview the production build locally |
| `test` | `npm run test` | Run Vitest test suite |
| `db:push` | `npm run db:push` | Push database migrations to Supabase |
| `db:reset` | `npm run db:reset` | Reset the database (destructive) |
| `functions:deploy` | `npm run functions:deploy` | Deploy all Supabase Edge Functions |
| `functions:serve` | `npm run functions:serve` | Serve Edge Functions locally for development |

## Project Structure

```
cardtrader-monitor/
  src/              # React frontend (Vite + Tailwind)
  supabase/
    functions/      # Supabase Edge Functions (Deno runtime)
    migrations/     # Database schema (SQL)
  scripts/          # Node.js scripts for GitHub Actions
  tests/            # Vitest test files
  .github/workflows/ # CI/CD and scheduled workflows
  docs/             # Documentation
```

## Troubleshooting

- **Edge Functions returning 401/403:** Make sure "Verify JWT with legacy secret" is set to **false** for each Edge Function in the Supabase Dashboard.
- **OAuth redirect not working:** Verify the redirect URI in Google Cloud Console matches exactly: `https://<project-ref>.supabase.co/auth/v1/callback`.
- **Local dev not loading:** Ensure `.env` has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` set correctly.
- **Telegram bot not responding:** Check that the webhook URL is set correctly and the Edge Function is deployed.
