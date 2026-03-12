import type {
  Blueprint,
  CardFilters,
  FixedPriceRule,
  MarketplaceProduct,
  MonitoredCardWithPrice,
  NotificationRule,
  StabilityRule,
  ThresholdRule,
} from './cardtrader-types';

/**
 * Extract the wishlist ID from a CardTrader wishlist URL.
 * Supports URLs with or without locale prefix (e.g., /en/wishlists/123).
 */
export function extractWishlistId(url: string): string {
  const match = url.match(/cardtrader\.com\/(?:\w{2}\/)?wishlists\/(\d+)/);
  if (!match) {
    throw new Error('Invalid CardTrader wishlist URL');
  }
  return match[1];
}

/**
 * Filter marketplace products to only CT Zero-eligible sellers.
 * CT Zero qualification: can_sell_via_hub OR user_type=pro OR can_sell_sealed_with_ct_zero.
 * Also filters by condition (if set) and language.
 */
export function filterCtZeroOffers(
  products: MarketplaceProduct[],
  filters: CardFilters,
): MarketplaceProduct[] {
  return products.filter((item) => {
    const conditionMatch =
      !filters.condition || item.properties_hash.condition === filters.condition;
    const languageMatch = item.properties_hash.mtg_language === filters.language;
    const isCtZero =
      item.user.can_sell_sealed_with_ct_zero === true ||
      item.user.user_type === 'pro' ||
      item.user.can_sell_via_hub === true;
    return conditionMatch && languageMatch && isCtZero;
  });
}

/**
 * Find the cheapest price (in cents) from marketplace products after applying
 * CT Zero and card filters. Returns null if no offers match.
 */
export function findCheapestPrice(
  products: MarketplaceProduct[],
  filters: CardFilters,
): number | null {
  const filtered = filterCtZeroOffers(products, filters);
  if (filtered.length === 0) return null;
  return Math.min(...filtered.map((p) => p.price.cents));
}

/**
 * Process items in batches with a delay between each batch.
 * Default: 8 items per batch, 1000ms delay.
 */
export async function processBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 8,
  delayMs = 1000,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

/**
 * Map a CardTrader Blueprint API response to the monitored_card table shape.
 */
export function mapBlueprintToCard(
  blueprint: Blueprint,
  expansionId: number,
): {
  blueprint_id: number;
  card_name: string;
  game_id: number;
  collector_number: string;
  image_url: string;
  expansion_id: number;
} {
  return {
    blueprint_id: blueprint.id,
    card_name: blueprint.name,
    game_id: blueprint.game_id,
    collector_number: blueprint.fixed_properties.collector_number,
    image_url: blueprint.image_url,
    expansion_id: expansionId,
  };
}

/**
 * Create the default notification rule for newly imported cards.
 * +/-20% threshold from baseline, both directions, enabled.
 */
export function createDefaultNotificationRule(): ThresholdRule {
  return {
    type: 'threshold',
    threshold_percent: 20,
    direction: 'both',
    enabled: true,
  };
}

/**
 * Create the default fixed price rule.
 * Triggers when price drops to or below 1.00 EUR.
 */
export function createDefaultFixedPriceRule(): FixedPriceRule {
  return {
    type: 'fixed_price',
    price_eur: 1.0,
    direction: 'down',
    enabled: true,
  };
}

/**
 * Create a default stability rule.
 * Triggers when price stays within range_percent for consecutive_days.
 */
export function createDefaultStabilityRule(): StabilityRule {
  return {
    type: 'stability',
    range_percent: 5,
    consecutive_days: 3,
    enabled: true,
  };
}

/**
 * Create the default notification rules array for newly imported cards.
 * Contains a single default threshold rule.
 */
export function createDefaultNotificationRules(): NotificationRule[] {
  return [createDefaultNotificationRule()];
}

/**
 * Map a language code to its corresponding country flag emoji.
 * Uses regional indicator symbols. Unknown codes return uppercase text.
 */
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'GB',
  it: 'IT',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  pt: 'PT',
  ja: 'JP',
  ko: 'KR',
  zh: 'CN',
  ru: 'RU',
};

export function languageToFlag(lang: string): string {
  const countryCode = LANGUAGE_TO_COUNTRY[lang];
  if (!countryCode) {
    return lang.toUpperCase();
  }
  // Convert country code to regional indicator symbols (flag emoji)
  return [...countryCode]
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join('');
}

/**
 * Sort cards: active first by price ascending (null prices at end),
 * inactive at bottom also sorted by price ascending.
 * Returns a new sorted array (does not mutate the original).
 */
export function sortCards(cards: MonitoredCardWithPrice[]): MonitoredCardWithPrice[] {
  return [...cards].sort((a, b) => {
    // Active before inactive
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1;
    }
    // Within same active group: price ascending, null at end
    const priceA = a.latest_price_cents;
    const priceB = b.latest_price_cents;
    if (priceA === null && priceB === null) return 0;
    if (priceA === null) return 1;
    if (priceB === null) return -1;
    return priceA - priceB;
  });
}

/**
 * Return unique blueprint IDs from an array of objects with blueprint_id.
 */
export function deduplicateBlueprintIds(cards: Array<{ blueprint_id: number }>): number[] {
  return [...new Set(cards.map((c) => c.blueprint_id))];
}

/**
 * Get retention days, clamped to [1, 365] range.
 * Returns 30 if no value or null/undefined provided.
 */
export function getRetentionDays(value?: number | null): number {
  if (value == null) return 30;
  return Math.max(1, Math.min(365, value));
}
