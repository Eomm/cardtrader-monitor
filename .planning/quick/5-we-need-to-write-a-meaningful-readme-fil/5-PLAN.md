---
phase: quick
plan: 5
type: execute
wave: 1
depends_on: []
files_modified: [README.md]
autonomous: true
requirements: []

must_haves:
  truths:
    - "README explains what the project does and why"
    - "README covers how to set up and run the project locally"
    - "README documents required environment variables and external services"
    - "README describes the tech stack and architecture"
  artifacts:
    - path: "README.md"
      provides: "Comprehensive project documentation"
      min_lines: 80
  key_links: []
---

<objective>
Write a meaningful README.md that explains what CardTrader Monitor is, how to set it up, and how it works.

Purpose: The current README is a placeholder with just the skills list. A real README helps contributors and users understand the project.
Output: Complete README.md
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write comprehensive README.md</name>
  <files>README.md</files>
  <action>
Rewrite README.md with the following sections. Keep the tone practical and concise -- this is a small personal project, not enterprise software.

**Structure:**

1. **Title + tagline**: "CardTrader Monitor" with one-liner: "Get notified when trading card prices move on CardTrader -- so you can act on deals without constantly checking."

2. **What it does** (3-5 bullet points):
   - Import wishlists from CardTrader and track card prices
   - Set per-card notification rules: threshold alerts (price drops/rises X%) and fixed price alerts (price crosses a target)
   - Receive Telegram notifications when rules trigger
   - Hourly price checks and daily wishlist sync via GitHub Actions
   - Web dashboard to view cards, prices, and manage rules

3. **Tech Stack** (brief list):
   - Frontend: React 19, Vite, Tailwind CSS v4, deployed to GitHub Pages
   - Backend: Supabase (Postgres, Edge Functions, Auth with Google OAuth)
   - Background jobs: GitHub Actions (fetch-prices hourly, sync-wishlists daily, cleanup-snapshots daily)
   - Notifications: Telegram Bot API
   - Linting: Biome

4. **Architecture overview** (short paragraph):
   - Static SPA on GitHub Pages talks to Supabase
   - Edge Functions handle CardTrader API calls (import-wishlist, send-test-message, telegram-webhook)
   - GitHub Actions scripts (scripts/) run scheduled tasks: fetch-prices.ts, sync-wishlists.ts, cleanup-snapshots.ts
   - All on free tiers (Supabase free, GitHub Pages free, GitHub Actions 2000 min/month)

5. **Prerequisites**:
   - Node.js (for frontend dev)
   - Supabase CLI (`supabase`)
   - A Supabase project (free tier)
   - A CardTrader account + API token
   - A Telegram bot (via @BotFather)

6. **Getting Started** (numbered steps):
   - Clone repo, `npm install`
   - Copy `.env.example` to `.env` and fill in Supabase URL + anon key
   - Set up Supabase: `supabase db push` to apply migrations
   - Deploy Edge Functions: `npm run functions:deploy`
   - Configure Supabase Edge Functions: set `Verify JWT with legacy secret` to false in dashboard
   - Set up GitHub secrets for Actions: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CARDTRADER_API_TOKEN, TELEGRAM_BOT_TOKEN
   - Run dev server: `npm run dev`

7. **Scripts** (table):
   | Command | Description |
   | `npm run dev` | Start dev server |
   | `npm run build` | Build for production |
   | `npm run check` | Run Biome linter |
   | `npm run test` | Run tests |
   | `npm run db:push` | Push DB migrations to Supabase |
   | `npm run functions:deploy` | Deploy Supabase Edge Functions |
   | `npm run functions:serve` | Serve Edge Functions locally |

8. **GitHub Actions Workflows** (brief table):
   | Workflow | Schedule | What it does |
   | fetch-prices | Hourly | Fetches current prices, evaluates notification rules, sends Telegram alerts |
   | sync-wishlists | Daily | Re-syncs wishlists from CardTrader (metadata updates, removed card cleanup) |
   | cleanup-snapshots | Daily at 04:00 UTC | Removes price snapshots older than retention window |
   | deploy | On push to main | Builds and deploys frontend to GitHub Pages |
   | ci | On push/PR | Runs lint, type check, tests |

9. **License**: MIT

Do NOT include the skills list from the current README. That was scaffolding, not user-facing documentation.
Do NOT use emojis.
  </action>
  <verify>
    <automated>test -f README.md && wc -l README.md | awk '{if ($1 >= 80) print "OK"; else print "FAIL: too short"}'</automated>
  </verify>
  <done>README.md has all sections listed above, is accurate to the actual project structure, and reads clearly</done>
</task>

</tasks>

<verification>
- README.md exists with all required sections
- All referenced files/paths are accurate (scripts/, supabase/functions/, .github/workflows/)
- Environment variables match .env.example
- Script commands match package.json
</verification>

<success_criteria>
README.md is a useful, accurate document that a new developer could follow to understand and set up the project.
</success_criteria>

<output>
After completion, create `.planning/quick/5-we-need-to-write-a-meaningful-readme-fil/5-SUMMARY.md`
</output>
