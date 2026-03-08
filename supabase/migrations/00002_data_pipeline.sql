-- CardTrader Monitor - Phase 2: Data Pipeline Schema
-- Adds baseline pricing, retention, cache tables, and decrypt function

-- =============================================================================
-- 1. ALTER monitored_cards: add baseline_price_cents and retention_days
-- =============================================================================

ALTER TABLE public.monitored_cards
  ADD COLUMN IF NOT EXISTS baseline_price_cents int,
  ADD COLUMN IF NOT EXISTS retention_days int NOT NULL DEFAULT 30;

COMMENT ON COLUMN public.monitored_cards.baseline_price_cents IS
  'Cheapest CT Zero price at import time (EUR cents). NULL = no offers found.';
COMMENT ON COLUMN public.monitored_cards.retention_days IS
  'Number of days to retain price snapshots for this card. Default 30, range 1-365.';

-- =============================================================================
-- 2. Create ct_blueprints cache table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ct_blueprints (
  id int PRIMARY KEY,
  expansion_id int NOT NULL REFERENCES public.ct_expansions(id),
  name text NOT NULL,
  game_id int,
  collector_number text,
  image_url text,
  scryfall_id text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ct_blueprints_expansion_id
  ON public.ct_blueprints(expansion_id);
CREATE INDEX IF NOT EXISTS idx_ct_blueprints_collector_number
  ON public.ct_blueprints(expansion_id, collector_number);

COMMENT ON TABLE public.ct_blueprints IS
  'Cache of CardTrader blueprint reference data. Populated by Edge Functions and GitHub Actions.';

-- =============================================================================
-- 4. Get API token function (plaintext for MVP — TODO: encrypt at rest post-MVP)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_api_token(target_user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT cardtrader_api_token
    FROM public.profiles
    WHERE id = target_user_id
      AND cardtrader_api_token IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_api_token(uuid) IS
  'Get a user API token by user ID. For Edge Function and service role use.';

-- =============================================================================
-- 5. RLS for cache tables
-- =============================================================================

ALTER TABLE public.ct_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_blueprints ENABLE ROW LEVEL SECURITY;

-- SELECT: allow all authenticated users (public reference data)
CREATE POLICY ct_expansions_select ON public.ct_expansions
  FOR SELECT USING (true);

CREATE POLICY ct_blueprints_select ON public.ct_blueprints
  FOR SELECT USING (true);

-- INSERT/UPDATE: only service_role can write (Edge Functions and GH Actions
-- use service_role key which bypasses RLS, so these policies are a safety net
-- for anon/authenticated roles)
CREATE POLICY ct_expansions_insert ON public.ct_expansions
  FOR INSERT WITH CHECK (false);

CREATE POLICY ct_expansions_update ON public.ct_expansions
  FOR UPDATE USING (false);

CREATE POLICY ct_blueprints_insert ON public.ct_blueprints
  FOR INSERT WITH CHECK (false);

CREATE POLICY ct_blueprints_update ON public.ct_blueprints
  FOR UPDATE USING (false);

-- =============================================================================
-- 6. INSERT policy for price_snapshots
-- =============================================================================

-- Allow users to insert price snapshots for cards in their wishlists
CREATE POLICY price_snapshots_insert ON public.price_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.monitored_cards
      JOIN public.wishlists ON wishlists.id = monitored_cards.wishlist_id
      WHERE monitored_cards.id = price_snapshots.monitored_card_id
        AND wishlists.user_id = auth.uid()
    )
  );

-- Note: The GitHub Actions job uses service_role key which bypasses RLS entirely,
-- so no additional policy is needed for the cron job to insert price snapshots.
