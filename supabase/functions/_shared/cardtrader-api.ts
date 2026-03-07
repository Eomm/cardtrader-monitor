// CardTrader API helpers for Deno Edge Functions
// Types are defined inline (Deno cannot import from src/lib/)

const CARD_TRADER_BASE_URL = 'https://api.cardtrader.com/api/v2';

// ---------------------------------------------------------------------------
// Type definitions (mirrors src/lib/cardtrader-types.ts)
// ---------------------------------------------------------------------------

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

export interface CardFilters {
  condition?: string;
  language: string;
  foil?: boolean;
  onlyZero: boolean;
}

export interface NotificationRule {
  type: 'threshold';
  threshold_percent: number;
  direction: 'up' | 'down' | 'both';
  enabled: boolean;
}

export interface Wishlist {
  id: number;
  name: string;
  game_id: number;
  items: WishlistItem[];
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function authHeaders(apiToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

async function fetchJson<T>(url: string, apiToken: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(apiToken) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`CardTrader API error ${res.status} on ${url}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API call functions
// ---------------------------------------------------------------------------

/**
 * Fetch all expansions and return a Map keyed by expansion code.
 */
export async function fetchExpansions(
  apiToken: string,
): Promise<Map<string, Expansion>> {
  const expansions = await fetchJson<Expansion[]>(
    `${CARD_TRADER_BASE_URL}/expansions`,
    apiToken,
  );
  const map = new Map<string, Expansion>();
  for (const exp of expansions) {
    map.set(exp.code, exp);
  }
  return map;
}

/**
 * Fetch a single wishlist by ID and return the full wishlist object.
 */
export async function fetchWishlist(
  apiToken: string,
  wishlistId: string,
): Promise<Wishlist> {
  return fetchJson<Wishlist>(
    `${CARD_TRADER_BASE_URL}/wishlists/${wishlistId}`,
    apiToken,
  );
}

/**
 * Fetch blueprints for an expansion and return a Map keyed by collector_number.
 */
export async function fetchBlueprintsForExpansion(
  apiToken: string,
  expansionId: number,
): Promise<Map<string, Blueprint>> {
  const blueprints = await fetchJson<Blueprint[]>(
    `${CARD_TRADER_BASE_URL}/blueprints/export?expansion_id=${expansionId}`,
    apiToken,
  );
  const map = new Map<string, Blueprint>();
  for (const bp of blueprints) {
    if (bp.fixed_properties?.collector_number) {
      map.set(bp.fixed_properties.collector_number, bp);
    }
  }
  return map;
}

/**
 * Fetch marketplace products for a blueprint.
 * Response is keyed by blueprint_id as string, not an array!
 */
export async function fetchMarketplaceProducts(
  apiToken: string,
  blueprintId: number,
  language?: string,
): Promise<MarketplaceProduct[]> {
  let url = `${CARD_TRADER_BASE_URL}/marketplace/products?blueprint_id=${blueprintId}`;
  if (language) {
    url += `&language=${language}`;
  }
  const response = await fetchJson<Record<string, MarketplaceProduct[]>>(
    url,
    apiToken,
  );
  // Response is keyed by blueprint_id as string
  return response[String(blueprintId)] ?? [];
}

// ---------------------------------------------------------------------------
// Batch processing
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CT Zero filtering
// Canonical tests: tests/price-filter.test.ts
// ---------------------------------------------------------------------------

/**
 * Filter marketplace products to only CT Zero-eligible sellers.
 * CT Zero qualification: can_sell_via_hub OR user_type=pro OR can_sell_sealed_with_ct_zero.
 * Also filters by condition (if set) and language.
 *
 * This is a Deno re-implementation of src/lib/cardtrader-utils.ts filterCtZeroOffers.
 * Canonical tests: tests/price-filter.test.ts
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
 *
 * Canonical tests: tests/price-filter.test.ts
 */
export function findCheapestPrice(
  products: MarketplaceProduct[],
  filters: CardFilters,
): number | null {
  const filtered = filterCtZeroOffers(products, filters);
  if (filtered.length === 0) return null;
  return Math.min(...filtered.map((p) => p.price.cents));
}
