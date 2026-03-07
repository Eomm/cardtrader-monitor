import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  type Blueprint,
  type Expansion,
  type NotificationRule,
  type WishlistItem,
  fetchBlueprintsForExpansion,
  fetchExpansions,
  fetchMarketplaceProducts,
  fetchWishlist,
  findCheapestPrice,
  processBatches,
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
      return new Response(JSON.stringify({ error: 'Invalid CardTrader wishlist URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -----------------------------------------------------------------------
    // 4. Get CardTrader API token
    // -----------------------------------------------------------------------
    const { data: apiToken, error: tokenError } = await supabaseAdmin.rpc('get_api_token', {
      target_user_id: user.id,
    });

    if (tokenError || !apiToken) {
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
    const expansionNameLookup = new Map<string, string>();

    const uniqueExpansionCodes = Array.from(itemsByExpansion.keys());
    await processBatches(
      uniqueExpansionCodes,
      async (code) => {
        const expansion = expansionMap.get(code);
        if (!expansion) return;

        expansionNameLookup.set(code, expansion.name);

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
      expansionName: string;
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
        expansionName: expansionNameLookup.get(item.expansion_code) ?? expansion.name,
      });
    }

    // 5g. For each resolved card: fetch marketplace products and find cheapest price
    const prices = await processBatches(
      resolvedCards,
      async (card) => {
        try {
          const products = await fetchMarketplaceProducts(
            apiToken,
            card.blueprint.id,
            card.item.language,
          );
          const cheapest = findCheapestPrice(products, {
            condition: card.item.condition || undefined,
            language: card.item.language,
            foil: normaliseFoil(card.item.foil) || undefined,
            onlyZero: true,
          });
          return cheapest;
        } catch {
          // If marketplace fetch fails for a single card, continue with null price
          return null;
        }
      },
      8,
      1000,
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
      expansion_name: card.expansionName,
      game_id: card.blueprint.game_id,
      collector_number: card.blueprint.fixed_properties.collector_number,
      image_url: card.blueprint.image_url,
      baseline_price_cents: prices[idx] ?? null,
      notification_rule: defaultRule,
      only_zero: true,
      condition_required: card.item.condition || null,
      language_required: card.item.language,
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
        // If upsert fails (e.g. no unique constraint), try plain insert
        const { data: fallbackInserted, error: fallbackError } = await supabaseAdmin
          .from('monitored_cards')
          .insert(row)
          .select('id')
          .single();

        if (fallbackError) {
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
      await supabaseAdmin.from('price_snapshots').insert(snapshotRows);
    }

    // -----------------------------------------------------------------------
    // 8. Return response
    // -----------------------------------------------------------------------
    const importedCount = importedDetails.filter((d) => d.status === 'imported').length;
    const skippedCount = importedDetails.filter((d) => d.status === 'skipped').length;

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

    if (message.includes('CardTrader API error')) {
      return new Response(JSON.stringify({ error: `CardTrader API error: ${message}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Internal server error: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
