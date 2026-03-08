-- CardTrader Monitor - Initial Database Schema
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  cardtrader_api_token text,
  telegram_chat_id bigint,
  telegram_link_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  cardtrader_wishlist_id text NOT NULL,
  name text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ct_expansions (
  id int PRIMARY KEY,
  game_id int NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ct_expansions IS
  'Cache of CardTrader expansion reference data. Populated by Edge Functions and GitHub Actions.';

CREATE TABLE public.monitored_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid NOT NULL REFERENCES public.wishlists ON DELETE CASCADE,
  blueprint_id bigint NOT NULL,
  card_name text NOT NULL,
  expansion_id int REFERENCES public.ct_expansions(id),
  game_id int,
  collector_number text,
  image_url text,
  notification_rule jsonb,
  only_zero boolean NOT NULL DEFAULT true,
  condition_required text,
  language_required text,
  foil_required boolean,
  reverse_required boolean,
  first_edition_required boolean,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_card_id uuid NOT NULL REFERENCES public.monitored_cards ON DELETE CASCADE,
  price_cents int NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  marketplace_data jsonb
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_card_id uuid NOT NULL REFERENCES public.monitored_cards ON DELETE CASCADE,
  notification_type text NOT NULL,
  old_price_cents int,
  new_price_cents int,
  sent_at timestamptz NOT NULL DEFAULT now(),
  telegram_message_id text
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE UNIQUE INDEX idx_wishlists_user_wishlist ON public.wishlists (user_id, cardtrader_wishlist_id);
CREATE UNIQUE INDEX idx_monitored_cards_wishlist_blueprint ON public.monitored_cards (wishlist_id, blueprint_id);
CREATE INDEX idx_wishlists_user_id ON public.wishlists (user_id);
CREATE INDEX idx_monitored_cards_wishlist_id ON public.monitored_cards (wishlist_id);
CREATE INDEX idx_monitored_cards_blueprint_id ON public.monitored_cards (blueprint_id);
CREATE INDEX idx_price_snapshots_card_id ON public.price_snapshots (monitored_card_id);
CREATE INDEX idx_price_snapshots_recorded_at ON public.price_snapshots (recorded_at DESC);
CREATE INDEX idx_notifications_card_id ON public.notifications (monitored_card_id);

-- =============================================================================
-- Updated_at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_wishlists_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_monitored_cards_updated_at
  BEFORE UPDATE ON public.monitored_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Auto-create profile on signup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Token storage functions (plaintext for MVP — TODO: encrypt at rest post-MVP)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.save_api_token(token text)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    cardtrader_api_token = token,
    updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_api_token()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND cardtrader_api_token IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.remove_api_token()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET cardtrader_api_token = NULL, updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read and update their own row
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Wishlists: users can CRUD their own wishlists
CREATE POLICY wishlists_select ON public.wishlists
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY wishlists_insert ON public.wishlists
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY wishlists_update ON public.wishlists
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY wishlists_delete ON public.wishlists
  FOR DELETE USING (user_id = auth.uid());

-- Monitored cards: users can CRUD via wishlist ownership
CREATE POLICY monitored_cards_select ON public.monitored_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE wishlists.id = monitored_cards.wishlist_id
        AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY monitored_cards_insert ON public.monitored_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE wishlists.id = monitored_cards.wishlist_id
        AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY monitored_cards_update ON public.monitored_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE wishlists.id = monitored_cards.wishlist_id
        AND wishlists.user_id = auth.uid()
    )
  );

CREATE POLICY monitored_cards_delete ON public.monitored_cards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE wishlists.id = monitored_cards.wishlist_id
        AND wishlists.user_id = auth.uid()
    )
  );

-- Price snapshots: users can read via monitored_cards -> wishlists chain
CREATE POLICY price_snapshots_select ON public.price_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.monitored_cards
      JOIN public.wishlists ON wishlists.id = monitored_cards.wishlist_id
      WHERE monitored_cards.id = price_snapshots.monitored_card_id
        AND wishlists.user_id = auth.uid()
    )
  );

-- Notifications: users can read via monitored_cards -> wishlists chain
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.monitored_cards
      JOIN public.wishlists ON wishlists.id = monitored_cards.wishlist_id
      WHERE monitored_cards.id = notifications.monitored_card_id
        AND wishlists.user_id = auth.uid()
    )
  );
