import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  type Blueprint,
  fetchBlueprintsForExpansion,
  fetchExpansions,
  fetchMarketplaceProducts,
  fetchWishlist,
  findCheapestPrice,
  type NotificationRule,
  processBatches,
  type WishlistItem,
} from '../_shared/cardtrader-api.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract wishlist ID from a CardTrader wishlist URL. */
function extractWishlistId(url: string): string | null {
  const match = url.match(/cardtrader\.com\/(?:\w{2}\/)?wishlists\/(\d+)/);
  return match ? match[1] : null;
}

/** Create the default notification rule for newly imported cards. */
function createDefaultNotificationRule(): NotificationRule {
  return {
    type: 'threshold',
    threshold_percent: 20,
    direction: 'both',
    enabled: true,
  };
}

/** Normalise wishlist foil field (string "true"/"false" or boolean) to boolean. */
function normaliseFoil(foil: string | boolean): boolean {
  if (typeof foil === 'boolean') return foil;
  return foil === 'true';
}

/**
 * Normalise wishlist language. CardTrader returns `null`, `"null"`, or `""` when
 * the user didn't pin a language; we default to `"en"` so it matches marketplace
 * offers (whose `mtg_language` is always a concrete code like `"en"`). This is
 * the same fallback scripts/fetch-prices.ts uses at read time, applied here at
 * write time so the DB never holds a bogus `"null"` string.
 */
function normaliseLanguage(lang: string | null | undefined): string {
  if (!lang || lang === 'null') return 'en';
  return lang;
}

/** Normalise wishlist condition. Treat null/"null"/empty as "no constraint". */
function normaliseCondition(cond: string | null | undefined): string | null {
  if (!cond || cond === 'null') return null;
  return cond;
}

// ---------------------------------------------------------------------------
// Edge Function entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // -----------------------------------------------------------------------
    // 1. Validate request
    // -----------------------------------------------------------------------
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { wishlistUrl } = await req.json();
    if (!wishlistUrl || typeof wishlistUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid wishlistUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const wishlistId = extractWishlistId(wishlistUrl);
    if (!wishlistId) {
      console.warn(`[import-wishlist] Invalid CardTrader wishlist URL: ${wishlistUrl}`);
      return new Response(JSON.stringify({ error: 'Invalid CardTrader wishlist URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[import-wishlist] Starting import for wishlist ${wishlistId}`);

    // -----------------------------------------------------------------------
    // 2. Auth: create Supabase clients
    // -----------------------------------------------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // User-scoped client (respects RLS)
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client (bypasses RLS for cache writes and token decryption)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // -----------------------------------------------------------------------
    // 3. Get authenticated user
    // -----------------------------------------------------------------------
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.warn(`[import-wishlist] Auth failed: ${userError?.message ?? 'no user from token'}`);
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -----------------------------------------------------------------------
    // 3b. Check wishlist count limit (max 2 per user)
    // -----------------------------------------------------------------------
    const { count, error: countError } = await supabaseAdmin
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error(
        `[import-wishlist] Failed to check wishlist count for user ${user.id}: ${countError.message}`,
      );
      return new Response(JSON.stringify({ error: 'Failed to check wishlist count' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (count !== null && count >= 2) {
      return new Response(
        JSON.stringify({
          error: 'Maximum 2 wishlists allowed. Remove an existing wishlist to import a new one.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // -----------------------------------------------------------------------
    // 4. Get CardTrader API token
    // -----------------------------------------------------------------------
    const { data: apiToken, error: tokenError } = await supabaseAdmin.rpc('get_api_token', {
      target_user_id: user.id,
    });

    if (tokenError || !apiToken) {
      console.warn(
        `[import-wishlist] Missing/undecryptable API token for user ${user.id}: ${tokenError?.message ?? 'token is null'}`,
      );
      return new Response(
        JSON.stringify({
          error: 'Please add your CardTrader API token in Settings',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // -----------------------------------------------------------------------
    // 5. Import flow (following garcon call order)
    // -----------------------------------------------------------------------

    // 5a. Fetch expansions and build code-to-expansion map
    const expansionMap = await fetchExpansions(apiToken);

    // 5b. Cache expansions in ct_expansions table
    const expansionRows = Array.from(expansionMap.values()).map((exp) => ({
      id: exp.id,
      game_id: exp.game_id,
      code: exp.code,
      name: exp.name,
      fetched_at: new Date().toISOString(),
    }));
    if (expansionRows.length > 0) {
      await supabaseAdmin.from('ct_expansions').upsert(expansionRows, { onConflict: 'id' });
    }

    // 5c. Fetch wishlist items
    const wishlist = await fetchWishlist(apiToken, wishlistId);
    console.log(
      `[import-wishlist] Fetched wishlist "${wishlist.name}" (${wishlist.items.length} items) and ${expansionMap.size} expansions`,
    );

    // 5d. Group items by expansion_code, resolve to expansion_id
    const itemsByExpansion = new Map<string, WishlistItem[]>();
    for (const item of wishlist.items) {
      const code = item.expansion_code;
      if (!itemsByExpansion.has(code)) {
        itemsByExpansion.set(code, []);
      }
      itemsByExpansion.get(code)?.push(item);
    }

    // 5e. For each unique expansion: fetch blueprints, cache, build lookup
    // Maps expansion_code -> (collector_number -> Blueprint)
    const blueprintLookup = new Map<string, Map<string, Blueprint>>();

    const uniqueExpansionCodes = Array.from(itemsByExpansion.keys());
    await processBatches(
      uniqueExpansionCodes,
      async (code) => {
        const expansion = expansionMap.get(code);
        if (!expansion) return;

        const bpMap = await fetchBlueprintsForExpansion(apiToken, expansion.id);
        blueprintLookup.set(code, bpMap);

        // Cache blueprints in ct_blueprints table
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
          await supabaseAdmin.from('ct_blueprints').upsert(bpRows, { onConflict: 'id' });
        }
      },
      8,
      1000,
    );

    // 5f. Resolve each wishlist item to a blueprint
    interface ResolvedCard {
      item: WishlistItem;
      blueprint: Blueprint;
      expansionId: number;
    }

    const resolvedCards: ResolvedCard[] = [];
    const skippedCards: Array<{ card_name: string; reason: string }> = [];

    for (const item of wishlist.items) {
      const expansion = expansionMap.get(item.expansion_code);
      if (!expansion) {
        skippedCards.push({
          card_name: item.meta_name,
          reason: `Expansion not found: ${item.expansion_code}`,
        });
        continue;
      }

      const bpMap = blueprintLookup.get(item.expansion_code);
      const blueprint = bpMap?.get(item.collector_number);
      if (!blueprint) {
        skippedCards.push({
          card_name: item.meta_name,
          reason: 'Blueprint not found',
        });
        continue;
      }

      resolvedCards.push({
        item,
        blueprint,
        expansionId: expansion.id,
      });
    }

    console.log(
      `[import-wishlist] Resolved ${resolvedCards.length}/${wishlist.items.length} items to blueprints (${skippedCards.length} skipped)`,
    );
    for (const skipped of skippedCards) {
      console.log(`[import-wishlist] Skipped "${skipped.card_name}": ${skipped.reason}`);
    }

    // 5g. For each resolved card: fetch marketplace products and find cheapest price.
    // Mirrors scripts/fetch-prices.ts behaviour: fetcher returns { products, error? }
    // instead of throwing, so we can log every per-card failure individually.
    let fetchFailedCount = 0;
    let noOffersCount = 0;

    const prices = await processBatches(
      resolvedCards,
      async (card) => {
        const result = await fetchMarketplaceProducts(apiToken, card.blueprint.id);

        if (result.error) {
          console.warn(
            `[import-wishlist] Marketplace fetch failed for blueprint ${card.blueprint.id} (${card.blueprint.name}): ${result.error}`,
          );
          fetchFailedCount++;
          return null;
        }

        const normalisedCondition = normaliseCondition(card.item.condition);
        const normalisedLanguage = normaliseLanguage(card.item.language);
        const filters = {
          condition: normalisedCondition ?? undefined,
          language: normalisedLanguage,
          foil: normaliseFoil(card.item.foil) || undefined,
          onlyZero: true,
        };

        const cheapest = findCheapestPrice(result.products, filters);

        if (cheapest === null) {
          const sample = result.products[0]?.properties_hash;
          const sampleSeller = result.products[0]?.user;
          console.log(
            `[import-wishlist] No matching offers for blueprint ${card.blueprint.id} (${card.blueprint.name}) — ` +
              `${result.products.length} products returned, 0 passed filters. ` +
              `Filters (normalised): condition="${normalisedCondition ?? '(any)'}", language="${normalisedLanguage}", foil=${normaliseFoil(card.item.foil)}. ` +
              `Wishlist raw: condition="${card.item.condition}", language="${card.item.language}". ` +
              `Sample marketplace product: condition="${sample?.condition ?? 'n/a'}", language="${sample?.mtg_language ?? 'n/a'}", foil=${sample?.mtg_foil ?? 'n/a'}, ` +
              `seller: user_type="${sampleSeller?.user_type ?? 'n/a'}", can_sell_via_hub=${sampleSeller?.can_sell_via_hub ?? 'n/a'}, can_sell_sealed_with_ct_zero=${sampleSeller?.can_sell_sealed_with_ct_zero ?? 'n/a'}`,
          );
          noOffersCount++;
        }

        return cheapest;
      },
      8,
      1000,
    );

    const baselineSetCount = prices.filter((p) => p !== null).length;
    console.log(
      `[import-wishlist] Marketplace summary for wishlist ${wishlistId}: ${baselineSetCount}/${resolvedCards.length} baselines set, ${noOffersCount} cards had no matching offers, ${fetchFailedCount} fetches failed`,
    );

    // -----------------------------------------------------------------------
    // 6. Database inserts
    // -----------------------------------------------------------------------

    // 6a. Upsert wishlist row
    const { data: wishlistRow, error: wishlistError } = await supabaseAdmin
      .from('wishlists')
      .upsert(
        {
          user_id: user.id,
          cardtrader_wishlist_id: Number(wishlistId),
          name: wishlist.name || 'Imported Wishlist',
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,cardtrader_wishlist_id' },
      )
      .select('id')
      .single();

    if (wishlistError || !wishlistRow) {
      console.error(
        `[import-wishlist] Failed to upsert wishlist row for cardtrader_wishlist_id=${wishlistId} user=${user.id}: ${wishlistError?.message ?? 'unknown'}`,
      );
      return new Response(
        JSON.stringify({
          error: `Database error: Failed to upsert wishlist - ${wishlistError?.message ?? 'unknown'}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 6b. Insert monitored cards
    const defaultRule = createDefaultNotificationRule();
    const cardRows = resolvedCards.map((card, idx) => ({
      wishlist_id: wishlistRow.id,
      blueprint_id: card.blueprint.id,
      card_name: card.blueprint.name,
      expansion_id: card.expansionId,
      game_id: card.blueprint.game_id,
      collector_number: card.blueprint.fixed_properties.collector_number,
      image_url: card.blueprint.image_url,
      baseline_price_cents: prices[idx] ?? null,
      notification_rule: [defaultRule],
      only_zero: true,
      condition_required: normaliseCondition(card.item.condition),
      language_required: normaliseLanguage(card.item.language),
      foil_required: normaliseFoil(card.item.foil),
      is_active: true,
    }));

    const importedDetails: Array<{
      card_name: string;
      status: 'imported' | 'skipped';
      reason?: string;
    }> = [];

    // Insert cards, handling duplicates (same wishlist_id + blueprint_id)
    const insertedCardIds: Array<{ id: string; index: number }> = [];
    for (let i = 0; i < cardRows.length; i++) {
      const row = cardRows[i];
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('monitored_cards')
        .upsert(row, { onConflict: 'wishlist_id,blueprint_id' })
        .select('id')
        .single();

      if (insertError) {
        console.warn(
          `[import-wishlist] Upsert failed for ${row.card_name} (blueprint ${row.blueprint_id}): ${insertError.message} — falling back to insert`,
        );
        // If upsert fails (e.g. no unique constraint), try plain insert
        const { data: fallbackInserted, error: fallbackError } = await supabaseAdmin
          .from('monitored_cards')
          .insert(row)
          .select('id')
          .single();

        if (fallbackError) {
          console.error(
            `[import-wishlist] Fallback insert failed for ${row.card_name} (blueprint ${row.blueprint_id}): ${fallbackError.message}`,
          );
          importedDetails.push({
            card_name: row.card_name,
            status: 'skipped',
            reason: `DB insert error: ${fallbackError.message}`,
          });
          continue;
        }
        if (fallbackInserted) {
          insertedCardIds.push({ id: fallbackInserted.id, index: i });
        }
      } else if (inserted) {
        insertedCardIds.push({ id: inserted.id, index: i });
      }

      importedDetails.push({
        card_name: row.card_name,
        status: 'imported',
      });
    }

    // Add skipped cards to details
    for (const skipped of skippedCards) {
      importedDetails.push({
        card_name: skipped.card_name,
        status: 'skipped',
        reason: skipped.reason,
      });
    }

    // -----------------------------------------------------------------------
    // 7. Insert initial price snapshots for cards that have a price
    // -----------------------------------------------------------------------
    const snapshotRows = insertedCardIds
      .filter(({ index }) => prices[index] != null)
      .map(({ id, index }) => ({
        monitored_card_id: id,
        price_cents: prices[index],
        recorded_at: new Date().toISOString(),
      }));

    if (snapshotRows.length > 0) {
      const { error: snapshotError } = await supabaseAdmin
        .from('price_snapshots')
        .insert(snapshotRows);
      if (snapshotError) {
        console.error(
          `[import-wishlist] Failed to insert ${snapshotRows.length} initial price snapshots: ${snapshotError.message}`,
        );
      }
    }

    // -----------------------------------------------------------------------
    // 8. Return response
    // -----------------------------------------------------------------------
    const importedCount = importedDetails.filter((d) => d.status === 'imported').length;
    const skippedCount = importedDetails.filter((d) => d.status === 'skipped').length;

    console.log(
      `[import-wishlist] Done for wishlist ${wishlistId}: imported=${importedCount}, skipped=${skippedCount}, baselines=${baselineSetCount}, snapshots=${snapshotRows.length}`,
    );

    return new Response(
      JSON.stringify({
        imported: importedCount,
        skipped: skippedCount,
        wishlist_id: wishlistRow.id,
        details: importedDetails,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    // -----------------------------------------------------------------------
    // 9. Error handling
    // -----------------------------------------------------------------------
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    if (message.includes('CardTrader API error')) {
      console.error(`[import-wishlist] CardTrader API error: ${message}`);
      return new Response(JSON.stringify({ error: `CardTrader API error: ${message}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.error(`[import-wishlist] Internal server error: ${message}\n${stack ?? ''}`);
    return new Response(JSON.stringify({ error: `Internal server error: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
