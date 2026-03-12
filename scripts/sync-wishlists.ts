import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import type {
  Blueprint,
  CardFilters,
  Expansion,
  MarketplaceProduct,
} from '../src/lib/cardtrader-types.ts';
import {
  createDefaultNotificationRule,
  findCheapestPrice,
  mapBlueprintToCard,
  processBatches,
} from '../src/lib/cardtrader-utils.ts';

const CARDTRADER_API_BASE = 'https://api.cardtrader.com/api/v2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WishlistItem {
  quantity: number;
  meta_name: string;
  expansion_code: string;
  collector_number: string;
  language: string;
  condition: string;
  foil: string | boolean;
}

interface Wishlist {
  id: number;
  name: string;
  game_id: number;
  items: WishlistItem[];
}

interface WishlistRow {
  id: string;
  user_id: string;
  cardtrader_wishlist_id: string;
  name: string;
}

interface DbCard {
  id: string;
  blueprint_id: number;
  card_name: string;
  image_url: string | null;
  expansion_id: number;
}

interface ResolvedItem {
  item: WishlistItem;
  blueprint: Blueprint;
  expansionId: number;
}

interface SyncResult {
  added: number;
  removed: number;
  updated: number;
}

// ---------------------------------------------------------------------------
// CardTrader API helpers (Node.js re-implementation)
// ---------------------------------------------------------------------------

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`CardTrader API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function fetchExpansions(token: string): Promise<Map<string, Expansion>> {
  const expansions = await fetchJson<Expansion[]>(`${CARDTRADER_API_BASE}/expansions`, token);
  const map = new Map<string, Expansion>();
  for (const exp of expansions) {
    map.set(exp.code, exp);
  }
  return map;
}

async function fetchWishlist(token: string, wishlistId: string): Promise<Wishlist> {
  return fetchJson<Wishlist>(`${CARDTRADER_API_BASE}/wishlists/${wishlistId}`, token);
}

async function fetchBlueprintsForExpansion(
  token: string,
  expansionId: number,
): Promise<Map<string, Blueprint>> {
  const blueprints = await fetchJson<Blueprint[]>(
    `${CARDTRADER_API_BASE}/blueprints/export?expansion_id=${expansionId}`,
    token,
  );
  const map = new Map<string, Blueprint>();
  for (const bp of blueprints) {
    if (bp.fixed_properties?.collector_number) {
      map.set(bp.fixed_properties.collector_number, bp);
    }
  }
  return map;
}

async function fetchMarketplaceProducts(
  token: string,
  blueprintId: number,
  language: string,
): Promise<MarketplaceProduct[]> {
  const url = `${CARDTRADER_API_BASE}/marketplace/products?blueprint_id=${blueprintId}&language=${language}`;
  const data = await fetchJson<Record<string, MarketplaceProduct[]>>(url, token);
  return data[String(blueprintId)] ?? [];
}

// ---------------------------------------------------------------------------
// Foil normalization
// ---------------------------------------------------------------------------

function normaliseFoil(foil: string | boolean): boolean {
  if (typeof foil === 'boolean') return foil;
  return foil === 'true';
}

// ---------------------------------------------------------------------------
// Sync logic
// ---------------------------------------------------------------------------

async function syncWishlist(
  supabase: SupabaseClient,
  apiToken: string,
  wishlist: WishlistRow,
): Promise<SyncResult> {
  // 1. Fetch current wishlist from CardTrader API
  const ctWishlist = await fetchWishlist(apiToken, String(wishlist.cardtrader_wishlist_id));

  // 2. Get current DB cards for this wishlist
  const { data: dbCardRows, error: dbError } = await supabase
    .from('monitored_cards')
    .select('id, blueprint_id, card_name, image_url, expansion_id')
    .eq('wishlist_id', wishlist.id);

  if (dbError) {
    throw new Error(`Failed to query DB cards: ${dbError.message}`);
  }

  const dbCards: DbCard[] = (dbCardRows ?? []) as DbCard[];

  // 3. Resolve wishlist items to blueprint IDs
  const expansionMap = await fetchExpansions(apiToken);

  // Cache expansions
  const expansionRows = Array.from(expansionMap.values()).map((exp) => ({
    id: exp.id,
    game_id: exp.game_id,
    code: exp.code,
    name: exp.name,
    fetched_at: new Date().toISOString(),
  }));
  if (expansionRows.length > 0) {
    await supabase.from('ct_expansions').upsert(expansionRows, { onConflict: 'id' });
  }

  // Group wishlist items by expansion_code
  const itemsByExpansion = new Map<string, WishlistItem[]>();
  for (const item of ctWishlist.items) {
    const code = item.expansion_code;
    if (!itemsByExpansion.has(code)) {
      itemsByExpansion.set(code, []);
    }
    itemsByExpansion.get(code)?.push(item);
  }

  // For each unique expansion: check cache first, then API
  const blueprintLookup = new Map<string, Map<string, Blueprint>>();
  const expansionIdLookup = new Map<string, number>();

  const uniqueExpansionCodes = Array.from(itemsByExpansion.keys());
  await processBatches(
    uniqueExpansionCodes,
    async (code) => {
      const expansion = expansionMap.get(code);
      if (!expansion) return;

      expansionIdLookup.set(code, expansion.id);

      // Check ct_blueprints cache first
      const { data: cachedBlueprints } = await supabase
        .from('ct_blueprints')
        .select('*')
        .eq('expansion_id', expansion.id);

      let bpMap: Map<string, Blueprint>;

      if (cachedBlueprints && cachedBlueprints.length > 0) {
        bpMap = new Map<string, Blueprint>();
        for (const bp of cachedBlueprints) {
          if (bp.collector_number) {
            bpMap.set(bp.collector_number, {
              id: bp.id,
              name: bp.name,
              game_id: bp.game_id,
              fixed_properties: { collector_number: bp.collector_number },
              image_url: bp.image_url,
              scryfall_id: bp.scryfall_id ?? '',
            } as Blueprint);
          }
        }
      } else {
        bpMap = await fetchBlueprintsForExpansion(apiToken, expansion.id);

        // Cache newly fetched blueprints
        const bpRows = Array.from(bpMap.values()).map((bp) => ({
          id: bp.id,
          expansion_id: expansion.id,
          name: bp.name,
          game_id: bp.game_id,
          collector_number: bp.fixed_properties?.collector_number ?? null,
          image_url: bp.image_url,
          scryfall_id: bp.scryfall_id,
          fetched_at: new Date().toISOString(),
        }));
        if (bpRows.length > 0) {
          await supabase.from('ct_blueprints').upsert(bpRows, { onConflict: 'id' });
        }
      }

      blueprintLookup.set(code, bpMap);
    },
    8,
    1000,
  );

  // Build resolvedItems map: blueprint_id -> { item, blueprint, expansionName }
  const resolvedItems = new Map<number, ResolvedItem>();

  for (const item of ctWishlist.items) {
    const expansion = expansionMap.get(item.expansion_code);
    if (!expansion) continue;

    const bpMap = blueprintLookup.get(item.expansion_code);
    const blueprint = bpMap?.get(item.collector_number);
    if (!blueprint) continue;

    resolvedItems.set(blueprint.id, {
      item,
      blueprint,
      expansionId: expansionIdLookup.get(item.expansion_code) ?? expansion.id,
    });
  }

  // 4. Build sets for diff
  const apiBlueprints = new Set(resolvedItems.keys());
  const dbCardMap = new Map<number, DbCard>();
  for (const card of dbCards) {
    dbCardMap.set(card.blueprint_id, card);
  }

  // 5. Determine changes
  const toAdd: number[] = [];
  for (const bpId of apiBlueprints) {
    if (!dbCardMap.has(bpId)) {
      toAdd.push(bpId);
    }
  }

  const toRemoveIds: string[] = [];
  for (const card of dbCards) {
    if (!apiBlueprints.has(card.blueprint_id)) {
      toRemoveIds.push(card.id);
    }
  }

  const toUpdate: number[] = [];
  for (const bpId of apiBlueprints) {
    if (dbCardMap.has(bpId)) {
      toUpdate.push(bpId);
    }
  }

  // 6. Add new cards (with baseline price fetch)
  if (toAdd.length > 0) {
    const toAddItems = toAdd
      .map((bpId) => resolvedItems.get(bpId))
      .filter((item): item is NonNullable<typeof item> => item != null);
    const defaultRule = createDefaultNotificationRule();

    await processBatches(
      toAddItems,
      async (resolved) => {
        const { item, blueprint, expansionId } = resolved;
        const foilRequired = normaliseFoil(item.foil);

        // Fetch baseline price
        let baselinePriceCents: number | null = null;
        try {
          const products = await fetchMarketplaceProducts(apiToken, blueprint.id, item.language);
          baselinePriceCents = findCheapestPrice(products, {
            condition: item.condition || undefined,
            language: item.language,
            foil: foilRequired || undefined,
            onlyZero: true,
          });
        } catch {
          // Continue with null baseline if fetch fails
        }

        const cardData = mapBlueprintToCard(blueprint, expansionId);

        await supabase.from('monitored_cards').upsert(
          {
            ...cardData,
            wishlist_id: wishlist.id,
            baseline_price_cents: baselinePriceCents,
            notification_rule: [defaultRule],
            only_zero: true,
            condition_required: item.condition || null,
            language_required: item.language,
            foil_required: foilRequired,
            is_active: true,
          },
          { onConflict: 'wishlist_id,blueprint_id' },
        );
      },
      8,
      1000,
    );
  }

  // 7. Remove old cards (hard-delete, CASCADE handles snapshots/notifications)
  if (toRemoveIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('monitored_cards')
      .delete()
      .in('id', toRemoveIds);

    if (deleteError) {
      console.warn(`Failed to delete removed cards: ${deleteError.message}`);
    }
  }

  // 8. Update metadata for existing cards (never touch user settings)
  for (const bpId of toUpdate) {
    const resolved = resolvedItems.get(bpId);
    const dbCard = dbCardMap.get(bpId);
    if (!resolved || !dbCard) continue;

    await supabase
      .from('monitored_cards')
      .update({
        card_name: resolved.blueprint.name,
        image_url: resolved.blueprint.image_url,
        expansion_id: resolved.expansionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbCard.id);
  }

  // 9. Update wishlists.last_synced_at
  await supabase
    .from('wishlists')
    .update({ last_synced_at: new Date().toISOString(), name: ctWishlist.name })
    .eq('id', wishlist.id);

  return { added: toAdd.length, removed: toRemoveIds.length, updated: toUpdate.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function main(): Promise<void> {
  const startTime = Date.now();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
  });

  // 1. Query all wishlists
  const { data: wishlists, error: wishlistsError } = await supabase
    .from('wishlists')
    .select('id, user_id, cardtrader_wishlist_id, name');

  if (wishlistsError) {
    console.error('Failed to query wishlists:', wishlistsError.message);
    process.exit(1);
  }

  if (!wishlists || wishlists.length === 0) {
    console.log('No wishlists to sync');
    return;
  }

  // 2. Group wishlists by user_id
  const wishlistsByUser = new Map<string, WishlistRow[]>();
  for (const wl of wishlists) {
    const row = wl as WishlistRow;
    if (!wishlistsByUser.has(row.user_id)) {
      wishlistsByUser.set(row.user_id, []);
    }
    wishlistsByUser.get(row.user_id)?.push(row);
  }

  // 3. Process each user
  let totalAdded = 0;
  let totalRemoved = 0;
  let totalUpdated = 0;
  let totalSkippedUsers = 0;

  for (const [userId, userWishlists] of wishlistsByUser) {
    try {
      // Get API token for this user
      const { data: apiToken, error: tokenError } = await supabase.rpc('get_api_token', {
        target_user_id: userId,
      });

      if (tokenError || !apiToken) {
        console.warn(`No API token for user ${userId}, skipping`);
        totalSkippedUsers++;
        continue;
      }

      // Sync each wishlist for this user
      for (const wishlist of userWishlists) {
        const result = await syncWishlist(supabase, apiToken, wishlist);
        totalAdded += result.added;
        totalRemoved += result.removed;
        totalUpdated += result.updated;
        console.log(
          `Synced wishlist "${wishlist.name}" (${wishlist.cardtrader_wishlist_id}): +${result.added} -${result.removed} ~${result.updated}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Sync failed for user ${userId}: ${message}`);
      totalSkippedUsers++;
    }
  }

  // 4. Summary log
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `Sync complete: ${totalAdded} added, ${totalRemoved} removed, ${totalUpdated} updated, ${totalSkippedUsers} users skipped in ${elapsed}s`,
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
