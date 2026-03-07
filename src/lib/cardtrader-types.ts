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

export interface NotificationRule {
  type: 'threshold';
  threshold_percent: number;
  direction: 'up' | 'down' | 'both';
  enabled: boolean;
}

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
