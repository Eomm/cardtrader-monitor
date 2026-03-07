import { createClient } from '@supabase/supabase-js';
import type { CardFilters, MarketplaceProduct } from '../src/lib/cardtrader-types';
import {
  deduplicateBlueprintIds,
  filterCtZeroOffers,
  findCheapestPrice,
  processBatches,
} from '../src/lib/cardtrader-utils';

const CARDTRADER_API_BASE = 'https://api.cardtrader.com/api/v2';

interface MonitoredCardRow {
  id: string;
  blueprint_id: number;
  only_zero: boolean;
  condition_required: string | null;
  language_required: string | null;
  foil_required: boolean | null;
  is_active: boolean;
  user_id: string;
}

interface BlueprintGroup {
  blueprint_id: number;
  filters: CardFilters;
  cards: MonitoredCardRow[];
}

interface FetchResult {
  blueprint_id: number;
  products: MarketplaceProduct[];
  error?: string;
}

async function fetchMarketplaceProducts(
  blueprintId: number,
  language: string,
  token: string,
): Promise<FetchResult> {
  try {
    const url = `${CARDTRADER_API_BASE}/marketplace/products?blueprint_id=${blueprintId}&language=${language}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        blueprint_id: blueprintId,
        products: [],
        error: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = await response.json();

    // Response is an object keyed by blueprint_id (string), not an array
    const key = String(blueprintId);
    const products: MarketplaceProduct[] = Array.isArray(data[key]) ? data[key] : [];

    return { blueprint_id: blueprintId, products };
  } catch (err) {
    return {
      blueprint_id: blueprintId,
      products: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function main(): Promise<void> {
  const startTime = Date.now();

  // 1. Read and validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
  });

  // 2. Query all active monitored cards with user_id
  const { data: activeCards, error: cardsError } = await supabase
    .from('monitored_cards')
    .select(
      'id, blueprint_id, only_zero, condition_required, language_required, foil_required, is_active, wishlists!inner(user_id)',
    )
    .eq('is_active', true);

  if (cardsError) {
    console.error('Failed to query active cards:', cardsError.message);
    process.exit(1);
  }

  if (!activeCards || activeCards.length === 0) {
    console.log('No active cards to monitor');
    return;
  }

  // Flatten the join result to get user_id at the top level
  const cards: MonitoredCardRow[] = activeCards.map((row: Record<string, unknown>) => {
    const wishlists = row.wishlists as { user_id: string } | null;
    return {
      id: row.id as string,
      blueprint_id: row.blueprint_id as number,
      only_zero: row.only_zero as boolean,
      condition_required: row.condition_required as string | null,
      language_required: row.language_required as string | null,
      foil_required: row.foil_required as boolean | null,
      is_active: row.is_active as boolean,
      user_id: wishlists?.user_id ?? '',
    };
  });

  // 3. Deduplicate by blueprint_id and group cards
  const uniqueBlueprintIds = deduplicateBlueprintIds(cards);
  console.log(
    `Found ${cards.length} active cards across ${uniqueBlueprintIds.length} unique blueprints`,
  );

  const blueprintGroups: Map<number, BlueprintGroup> = new Map();
  for (const card of cards) {
    if (!blueprintGroups.has(card.blueprint_id)) {
      blueprintGroups.set(card.blueprint_id, {
        blueprint_id: card.blueprint_id,
        filters: {
          condition: card.condition_required ?? undefined,
          language: card.language_required ?? 'en',
          foil: card.foil_required ?? undefined,
          onlyZero: card.only_zero,
        },
        cards: [],
      });
    }
    const group = blueprintGroups.get(card.blueprint_id);
    if (group) {
      group.cards.push(card);
    }
  }

  // 4. Get API token from a user who has one
  const distinctUserIds = [...new Set(cards.map((c) => c.user_id))];
  let apiToken: string | null = null;

  for (const userId of distinctUserIds) {
    const { data: token, error: tokenError } = await supabase.rpc('get_api_token', {
      target_user_id: userId,
    });

    if (tokenError) {
      console.warn(`Failed to decrypt token for user ${userId}:`, tokenError.message);
      continue;
    }

    if (token) {
      apiToken = token;
      break;
    }
  }

  if (!apiToken) {
    console.error('No valid API tokens found among active card owners');
    process.exit(1);
  }

  // 5. Fetch prices in rate-limited batches
  const groups = [...blueprintGroups.values()];
  let failedCount = 0;

  const fetchResults = await processBatches(
    groups,
    async (group: BlueprintGroup): Promise<FetchResult> => {
      const result = await fetchMarketplaceProducts(
        group.blueprint_id,
        group.filters.language,
        apiToken,
      );
      if (result.error) {
        console.warn(`Failed to fetch blueprint ${group.blueprint_id}: ${result.error}`);
        failedCount++;
      }
      return result;
    },
    8,
    1000,
  );

  // Build a map of blueprint_id -> fetch result
  const resultsByBlueprint: Map<number, FetchResult> = new Map();
  for (const result of fetchResults) {
    resultsByBlueprint.set(result.blueprint_id, result);
  }

  // 6. Insert price snapshots
  const snapshots: Array<{
    monitored_card_id: string;
    price_cents: number;
    marketplace_data: unknown;
  }> = [];

  for (const card of cards) {
    const result = resultsByBlueprint.get(card.blueprint_id);
    if (!result || result.products.length === 0) {
      continue;
    }

    const filters: CardFilters = {
      condition: card.condition_required ?? undefined,
      language: card.language_required ?? 'en',
      foil: card.foil_required ?? undefined,
      onlyZero: card.only_zero,
    };

    const cheapest = findCheapestPrice(result.products, filters);
    if (cheapest === null) {
      console.log(`No matching offers for blueprint ${card.blueprint_id}`);
      continue;
    }

    // Get top 3 offers for marketplace_data
    const filtered = filterCtZeroOffers(result.products, filters);
    const topOffers = filtered
      .sort((a, b) => a.price.cents - b.price.cents)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        price_cents: p.price.cents,
        condition: p.properties_hash.condition,
        seller_type: p.user.user_type,
      }));

    snapshots.push({
      monitored_card_id: card.id,
      price_cents: cheapest,
      marketplace_data: { top_offers: topOffers, total_offers: filtered.length },
    });
  }

  if (snapshots.length > 0) {
    const { error: insertError } = await supabase.from('price_snapshots').insert(snapshots);

    if (insertError) {
      console.error('Failed to insert price snapshots:', insertError.message);
      process.exit(1);
    }
  }

  // 7. Log summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `Price fetch complete: ${snapshots.length} snapshots created for ${cards.length} cards (${uniqueBlueprintIds.length} blueprints queried, ${failedCount} failed) in ${elapsed}s`,
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
