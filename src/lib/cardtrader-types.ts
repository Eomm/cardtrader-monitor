export interface WishlistItem {
  quantity: number;
  meta_name: string;
  expansion_code: string;
  collector_number: string;
  language: string;
  condition: string;
  foil: string | boolean;
  reverse: string | boolean;
}

export interface MarketplaceProduct {
  id: number;
  price: {
    cents: number;
    formatted: string;
  };
  quantity: number;
  properties_hash: {
    condition: string;
    mtg_language: string;
    mtg_foil: boolean;
  };
  user: {
    can_sell_via_hub: boolean;
    user_type: string;
    can_sell_sealed_with_ct_zero: boolean;
  };
}

export interface Blueprint {
  id: number;
  name: string;
  game_id: number;
  fixed_properties: {
    collector_number: string;
  };
  image_url: string;
  scryfall_id: string;
}

export interface Expansion {
  id: number;
  game_id: number;
  code: string;
  name: string;
}

export interface ThresholdRule {
  type: 'threshold';
  threshold_percent: number;
  direction: 'up' | 'down' | 'both';
  enabled: boolean;
}

export interface StabilityRule {
  type: 'stability';
  range_percent: number;
  consecutive_days: number;
  enabled: boolean;
}

export type NotificationRule = ThresholdRule | StabilityRule;

export interface CardFilters {
  condition?: string;
  language: string;
  foil?: boolean;
  onlyZero: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  details: Array<{
    card_name: string;
    status: 'imported' | 'skipped';
    reason?: string;
  }>;
}

export type MonitoredCardWithPrice = {
  id: string;
  blueprint_id: number;
  card_name: string;
  expansion_name: string;
  game_id: number;
  collector_number: string | null;
  image_url: string | null;
  baseline_price_cents: number | null;
  notification_rule: NotificationRule[] | null;
  is_active: boolean;
  created_at: string;
  latest_price_cents: number | null;
  language_required: string;
  condition_required: string | null;
  foil_required: boolean | null;
  only_zero: boolean;
  wishlist_id: string;
};
