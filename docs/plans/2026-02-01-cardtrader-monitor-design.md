# CardTrader Monitor - Architecture Design

**Date:** February 1, 2026  
**Status:** Approved  
**Author:** Design Session with User

## Overview

CardTrader Monitor is a web application that allows users to track price changes for trading cards in their CardTrader wishlists and receive Telegram notifications when prices meet their defined thresholds.

### Key Features

- Google OAuth authentication
- CardTrader wishlist import via API
- Automated price checking every hour
- Customizable notification rules per card
- Telegram notifications for price alerts
- Support for card-specific filters (condition, language, foil, CardTrader Zero only, etc.)
- Zero-budget deployment using free tiers

## System Architecture

### Architecture Overview

**Frontend Layer (React SPA on GitHub Pages)**
- Plain React with Vite for fast builds
- Deployed to GitHub Pages via GitHub Actions
- Google OAuth for authentication via Supabase
- React Router for client-side routing
- Tailwind CSS for styling

**Backend API Layer (Supabase Edge Functions)**
- Deno-based serverless functions
- Handles wishlist imports from CardTrader API
- Telegram bot webhook handler
- Card notification rule updates

**Database Layer (Supabase Free Tier)**
- PostgreSQL database for all persistent data
- Row Level Security (RLS) for user data isolation
- Supabase Auth integration with Google OAuth
- Encrypted storage for CardTrader API tokens

**Background Jobs (GitHub Actions)**
- **Hourly Price Check**: Fetches current prices, evaluates rules, sends notifications
- **Daily Wishlist Sync**: Syncs wishlist contents from CardTrader
- Node.js/TypeScript scripts in `/jobs` folder

**External Services (All Free Tiers)**
- Google OAuth: User authentication
- CardTrader API: Wishlist and marketplace data
- Telegram Bot API: Push notifications

## Database Schema

### Tables

#### `auth.users` (Managed by Supabase Auth)
- `id` (uuid, primary key)
- `email` (text)
- `created_at` (timestamp)

#### `public.profiles`
User profiles and settings.

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cardtrader_api_token text, -- encrypted
  telegram_chat_id bigint,
  telegram_link_token text, -- temporary, expires after use
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `public.wishlists`
CardTrader wishlists being monitored.

```sql
CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cardtrader_wishlist_id text NOT NULL,
  name text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `public.monitored_cards`
Individual cards being tracked for price changes.

```sql
CREATE TABLE public.monitored_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  blueprint_id bigint NOT NULL,
  card_name text NOT NULL,
  expansion_name text NOT NULL,
  game_id int NOT NULL,
  collector_number text,
  image_url text,
  notification_rule jsonb NOT NULL, -- {type: 'price_drop', threshold: 10, unit: 'percent'}
  only_zero boolean DEFAULT true,
  condition_required text,
  language_required text,
  foil_required boolean,
  reverse_required boolean,
  first_edition_required boolean,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `public.price_snapshots`
Price history per monitored card (keeps latest 3 snapshots).

```sql
CREATE TABLE public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_card_id uuid NOT NULL REFERENCES public.monitored_cards(id) ON DELETE CASCADE,
  price_cents int NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  marketplace_data jsonb -- filtered products matching criteria
);
```

**Cleanup Strategy:** After each hourly price check, delete all snapshots keeping only the latest 3 per `monitored_card_id` (single query).

#### `public.notifications`
Log of sent notifications.

```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_card_id uuid NOT NULL REFERENCES public.monitored_cards(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'price_drop', 'price_increase', 'threshold_met'
  old_price_cents int,
  new_price_cents int NOT NULL,
  sent_at timestamptz DEFAULT now(),
  telegram_message_id text
);
```

### Indexes

```sql
CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX idx_monitored_cards_wishlist_id ON public.monitored_cards(wishlist_id);
CREATE INDEX idx_monitored_cards_blueprint_id ON public.monitored_cards(blueprint_id);
CREATE INDEX idx_price_snapshots_card_id ON public.price_snapshots(monitored_card_id);
CREATE INDEX idx_price_snapshots_recorded_at ON public.price_snapshots(recorded_at DESC);
CREATE INDEX idx_notifications_card_id ON public.notifications(monitored_card_id);
```

## User Flows

### 1. User Onboarding Flow

1. User visits app at `https://<username>.github.io/cardtrader-monitor`
2. Clicks "Sign in with Google"
3. Google OAuth flow → Supabase Auth creates user record
4. User redirected to `/dashboard`
5. User navigates to `/settings` and adds CardTrader API token
   - Token stored encrypted in `profiles.cardtrader_api_token`
6. User connects Telegram account:
   - Clicks "Connect Telegram" button
   - System generates unique token, stores in `profiles.telegram_link_token`
   - User shown: "Send `/start <token>` to @CardTraderMonitorBot"
   - User opens Telegram, sends command to bot
   - Bot Edge Function receives webhook:
     - Validates token against database
     - Stores `telegram_chat_id` in user's profile
     - Clears `telegram_link_token`
     - Sends confirmation: "✅ Connected! You'll receive price alerts here."
7. User pastes CardTrader wishlist URL (e.g., `https://www.cardtrader.com/wishlists/123456`)
8. Edge Function `import-wishlist`:
   - Extracts wishlist ID from URL
   - Fetches wishlist from CardTrader API using user's token
   - Parses cards and metadata
   - Creates `wishlists` record
   - Creates `monitored_cards` records for each card (with default rules)
   - Returns success to UI
9. User views cards in `/dashboard`, clicks card to customize notification rules

### 2. Hourly Price Check Flow (GitHub Actions)

**Workflow:** `.github/workflows/price-check.yml`  
**Schedule:** `0 * * * *` (every hour at :00)

1. GitHub Actions triggers cron job
2. Script connects to Supabase using `SUPABASE_SERVICE_ROLE_KEY`
3. Query: Fetch all active `monitored_cards` with join to `profiles` for `cardtrader_api_token`
4. Group cards by `blueprint_id` to optimize CardTrader API calls
5. For each unique blueprint:
   - Call CardTrader API: `GET /marketplace/products?blueprint_id={id}`
   - Receive up to 25 cheapest products
6. For each monitored card:
   - Filter marketplace products by card's criteria:
     - `only_zero`: Filter by `via_cardtrader_zero` flag
     - `condition_required`: Match product condition
     - `language_required`: Match product language
     - `foil_required`: Match foil status
     - `reverse_required`, `first_edition_required`: Match properties
   - Get cheapest matching price
   - Insert new `price_snapshots` record with price and filtered marketplace data
7. For each card with new snapshot:
   - Fetch last 2-3 snapshots for comparison
   - Evaluate notification rule (e.g., "notify if price drops 10%+")
   - If rule triggered:
     - Send Telegram message via `telegraf` to user's `telegram_chat_id`
     - Insert `notifications` record
8. **Cleanup:** Execute single query to delete old snapshots:
   ```sql
   DELETE FROM price_snapshots
   WHERE id NOT IN (
     SELECT id FROM (
       SELECT id, ROW_NUMBER() OVER (PARTITION BY monitored_card_id ORDER BY recorded_at DESC) as rn
       FROM price_snapshots
     ) sub WHERE rn <= 3
   );
   ```

### 3. Daily Wishlist Sync Flow (GitHub Actions)

**Workflow:** `.github/workflows/wishlist-sync.yml`  
**Schedule:** `0 0 * * *` (daily at midnight UTC)

1. GitHub Actions triggers cron job
2. Script connects to Supabase with service role key
3. Query: Fetch all `wishlists` with join to `profiles` for user tokens
4. For each wishlist:
   - Call CardTrader API: `GET /wishlists/{cardtrader_wishlist_id}`
   - Parse current wishlist contents
   - Compare with existing `monitored_cards` for this wishlist
   - **Add new cards:** Insert new `monitored_cards` records with default rules
   - **Remove deleted cards:** Set `is_active = false` for cards no longer in wishlist
   - Update `wishlists.last_synced_at = now()`
5. Log sync results (cards added/removed per wishlist)

## Technical Implementation

### Frontend (React SPA)

**Tech Stack:**
- **Build Tool:** Vite
- **Framework:** React 18+
- **Router:** React Router v6
- **Styling:** Tailwind CSS
- **State Management:** React Query (TanStack Query)
- **Auth:** `@supabase/supabase-js` (client-side)
- **Charts:** Recharts or Chart.js (for price history)

**Key Pages:**
- `/` - Landing page with login
- `/dashboard` - Overview of all monitored cards
- `/wishlists` - List wishlists, add new wishlist
- `/cards/:id` - Card detail page with price chart, edit rules
- `/settings` - CardTrader API token, Telegram connection

**Environment Variables:**
```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

**Build & Deploy:**
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Triggers on push to `main`
- Runs `npm run build`, outputs to `dist/`
- Deploys to `gh-pages` branch using `peaceiris/actions-gh-pages`

### Supabase Edge Functions (Deno)

**Functions:**

#### `import-wishlist`
- **Trigger:** POST request from frontend
- **Auth:** Requires valid Supabase JWT
- **Input:** `{ wishlist_url: string }`
- **Process:**
  1. Extract wishlist ID from URL
  2. Get user's `cardtrader_api_token` from database
  3. Call CardTrader API: `GET /wishlists/{id}`
  4. Parse response, create `wishlists` record
  5. For each card, create `monitored_cards` record with default rule
- **Output:** `{ success: boolean, wishlist_id: uuid, cards_imported: number }`

#### `telegram-webhook`
- **Trigger:** Telegram webhook (configured via BotFather)
- **Auth:** Validates Telegram webhook secret
- **Input:** Telegram Update object
- **Process:**
  1. Parse message (e.g., `/start <token>`)
  2. If `/start` command:
     - Extract token from message
     - Query `profiles` where `telegram_link_token = token`
     - Update `telegram_chat_id`, clear token
     - Send confirmation message via Telegram API
  3. If `/help` command:
     - Send help text
- **Output:** Telegram response

#### `update-card-rules`
- **Trigger:** PATCH request from frontend
- **Auth:** Requires valid Supabase JWT
- **Input:** `{ card_id: uuid, notification_rule: object }`
- **Process:**
  1. Validate user owns the card (via RLS)
  2. Update `monitored_cards.notification_rule`
- **Output:** `{ success: boolean }`

**Deployment:**
```bash
supabase functions deploy import-wishlist
supabase functions deploy telegram-webhook
supabase functions deploy update-card-rules
```

### GitHub Actions Jobs

**Shared Code Structure:**
```
/jobs
  /src
    /lib
      supabase.ts       # Supabase client setup
      cardtrader.ts     # CardTrader API client
      telegram.ts       # Telegraf bot setup
      filters.ts        # Product filtering logic
    price-check.ts      # Hourly price check script
    wishlist-sync.ts    # Daily wishlist sync script
  package.json
  tsconfig.json
```

**Dependencies:**
- `@supabase/supabase-js`
- `telegraf` (v4)
- `dotenv`
- TypeScript

**Environment Secrets (GitHub Secrets):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`

**Workflow Files:**

`.github/workflows/price-check.yml`:
```yaml
name: Hourly Price Check
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  price-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
        working-directory: ./jobs
      - run: npm run price-check
        working-directory: ./jobs
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
```

`.github/workflows/wishlist-sync.yml`:
```yaml
name: Daily Wishlist Sync
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:

jobs:
  wishlist-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
        working-directory: ./jobs
      - run: npm run wishlist-sync
        working-directory: ./jobs
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Security

**Authentication & Authorization:**
- Google OAuth via Supabase Auth
- Row Level Security (RLS) policies on all tables
- Users can only access their own data

**Example RLS Policies:**
```sql
-- profiles table
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- wishlists table
CREATE POLICY "Users can view own wishlists"
  ON public.wishlists FOR SELECT
  USING (user_id = auth.uid());

-- monitored_cards table
CREATE POLICY "Users can view own monitored cards"
  ON public.monitored_cards FOR SELECT
  USING (wishlist_id IN (
    SELECT id FROM public.wishlists WHERE user_id = auth.uid()
  ));
```

**Secrets Management:**
- CardTrader API tokens encrypted using Supabase Vault or `pgcrypto`
- Frontend uses Supabase anon key (safe to expose, RLS protects data)
- Background jobs use service role key (stored in GitHub Secrets)
- Telegram bot token stored in GitHub Secrets

**API Token Encryption Example:**
```sql
-- Using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt before insert
INSERT INTO profiles (id, cardtrader_api_token)
VALUES (
  auth.uid(),
  pgp_sym_encrypt('user_api_token', current_setting('app.encryption_key'))
);

-- Decrypt when needed (in Edge Functions/Jobs)
SELECT pgp_sym_decrypt(cardtrader_api_token::bytea, encryption_key)
FROM profiles WHERE id = user_id;
```

**Error Handling:**
- CardTrader API failures: Log error, skip card, continue processing
- Telegram send failures: Log error, mark notification as failed
- Rate limit handling: Exponential backoff, respect API limits (200 req/10s)
- Job failures: GitHub Actions logs capture all errors

## Free Tier Limits & Scaling

### Service Limits

**Supabase Free Tier:**
- Database: 500 MB storage
- Edge Functions: 500K invocations/month, 2M compute seconds
- Auth: Unlimited users
- Bandwidth: 5 GB/month
- Realtime: Not used

**GitHub Actions (Public Repo):**
- 2,000 minutes/month
- Unlimited workflows

**GitHub Pages:**
- 1 GB storage
- 100 GB bandwidth/month
- HTTPS included

**CardTrader API:**
- General: 200 requests per 10 seconds
- Marketplace products: 10 requests per second
- No monthly limit

**Telegram Bot API:**
- 30 messages/second per bot
- No monthly limit

### Estimated Usage (100 Users, 500 Cards Total)

**Database Storage:**
- Users: 100 × 1 KB = 100 KB
- Wishlists: 100 × 1 KB = 100 KB
- Monitored cards: 500 × 2 KB = 1 MB
- Price snapshots: 500 cards × 3 snapshots × 5 KB = 7.5 MB
- Notifications: ~1,000/month × 1 KB = 1 MB/month
- **Total: ~10-15 MB** ✅ Well under 500 MB limit

**Edge Functions:**
- Wishlist imports: ~100 initial + ~10/month = ~100/month
- Telegram webhook: ~50 connections/month
- Card rule updates: ~200/month
- **Total: ~350 invocations/month** ✅ Well under 500K limit

**GitHub Actions:**
- Hourly price check: 2 min × 24 × 30 = 1,440 min/month
- Daily wishlist sync: 5 min × 30 = 150 min/month
- Deploy workflow: 3 min × 10 = 30 min/month
- **Total: ~1,620 min/month** ✅ Under 2,000 min limit

**CardTrader API:**
- Hourly checks: 500 cards × 24 hours × 30 days = 360,000 requests/month
- Daily sync: 100 users × 30 days = 3,000 requests/month
- **Total: ~363,000 requests/month**
- **Rate: ~0.14 requests/second** ✅ Well under 200/10s limit

**Telegram API:**
- Notifications: ~1,000/month average
- **Rate: ~0.0004 messages/second** ✅ Well under 30/s limit

### Scaling Bottlenecks & Solutions

**Bottleneck 1: GitHub Actions execution time (2,000 min/month)**
- **Current capacity:** ~650 cards with hourly checks
- **Solutions:**
  - Deduplicate CardTrader API calls by `blueprint_id` (multiple users monitoring same card)
  - Optimize job logic (parallel processing where possible)
  - Stagger job start times across user cohorts
  - Consider moving to Supabase Edge Functions with scheduled triggers (when available)

**Bottleneck 2: Supabase database size (500 MB)**
- **Current capacity:** ~25,000 cards with full history
- **Solutions:**
  - Implement aggressive snapshot cleanup (keep only 3 per card)
  - Store minimal data in `marketplace_data` (only cheapest 3-5 products)
  - Archive old `notifications` after 90 days
  - Compress JSONB data

**Bottleneck 3: Supabase bandwidth (5 GB/month)**
- **Current capacity:** Depends on query efficiency
- **Solutions:**
  - Use database functions for complex queries (compute server-side)
  - Implement pagination in frontend
  - Cache frequently accessed data in React Query
  - Use indexes effectively

**Growth Thresholds:**
- **100-200 users:** Comfortable on all free tiers
- **200-500 users:** May hit GitHub Actions time limit, need optimization
- **500+ users:** Consider paid Supabase tier ($25/month) or split into multiple projects

## Next Steps

### Phase 1: Foundation (Week 1-2)
1. Set up Supabase project, create database schema
2. Create React app with Vite, set up GitHub Pages deployment
3. Implement Google OAuth login flow
4. Build basic dashboard UI

### Phase 2: Core Features (Week 3-4)
5. Create `import-wishlist` Edge Function
6. Build wishlist management UI
7. Implement card detail page with rule editor
8. Create hourly price check GitHub Action

### Phase 3: Notifications (Week 5)
9. Set up Telegram bot and Edge Function webhook
10. Implement Telegram connection flow in UI
11. Add notification dispatch to price check job
12. Create daily wishlist sync GitHub Action

### Phase 4: Polish (Week 6)
13. Add price history charts
14. Implement notification preferences
15. Add error handling and logging
16. Write user documentation
17. Open source release

## Open Questions

- Should we support multiple wishlists per user or limit to one?
  - **Decision:** Support multiple (schema already allows it)
- How should we handle CardTrader API token expiration?
  - **Decision:** Show error in UI, prompt user to update token
- Should we allow users to manually add cards (not from wishlist)?
  - **Decision:** Not in MVP, can add later
- How to handle rare cards with no marketplace listings?
  - **Decision:** Store null price, notify when first listing appears

## Glossary

- **Blueprint:** CardTrader's concept of a unique sellable card (e.g., "Black Lotus, Alpha, NM")
- **CardTrader Zero (CT0):** CardTrader's fulfillment service with authentication guarantees
- **Edge Function:** Deno-based serverless function on Supabase
- **Monitored Card:** A card from a wishlist being tracked for price changes
- **RLS (Row Level Security):** PostgreSQL feature for user-level data access control
- **Service Role Key:** Supabase key with admin access (bypasses RLS)
