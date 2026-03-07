import type {
  Blueprint,
  CardFilters,
  MarketplaceProduct,
  NotificationRule,
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
  expansionName: string,
): {
  blueprint_id: number;
  card_name: string;
  game_id: number;
  collector_number: string;
  image_url: string;
  expansion_name: string;
} {
  return {
    blueprint_id: blueprint.id,
    card_name: blueprint.name,
    game_id: blueprint.game_id,
    collector_number: blueprint.fixed_properties.collector_number,
    image_url: blueprint.image_url,
    expansion_name: expansionName,
  };
}

/**
 * Create the default notification rule for newly imported cards.
 * +/-20% threshold from baseline, both directions, enabled.
 */
export function createDefaultNotificationRule(): NotificationRule {
  return {
    type: 'threshold',
    threshold_percent: 20,
    direction: 'both',
    enabled: true,
  };
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
