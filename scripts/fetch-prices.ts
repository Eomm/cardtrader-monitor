import { createClient } from '@supabase/supabase-js';
import type {
  CardFilters,
  MarketplaceProduct,
  NotificationRule,
  ThresholdRule,
} from '../src/lib/cardtrader-types';
import {
  deduplicateBlueprintIds,
  filterCtZeroOffers,
  findCheapestPrice,
  processBatches,
} from '../src/lib/cardtrader-utils';
import { type ThresholdAlert, formatAlertMessage, shouldNotify } from '../src/lib/telegram-utils';

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
  card_name: string;
  baseline_price_cents: number | null;
  notification_rule: unknown;
  telegram_chat_id: number | null;
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

interface TelegramSendResult {
  ok: boolean;
  messageId: string | null;
  error?: string;
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<TelegramSendResult> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true },
      }),
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };

    if (!data.ok) {
      return {
        ok: false,
        messageId: null,
        error: data.description ?? `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      messageId: data.result ? String(data.result.message_id) : null,
    };
  } catch (err) {
    return {
      ok: false,
      messageId: null,
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
    console.error(
      'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
  });

  // 2. Query all active monitored cards with user_id and Telegram chat ID
  const { data: activeCards, error: cardsError } = await supabase
    .from('monitored_cards')
    .select(
      'id, blueprint_id, only_zero, condition_required, language_required, foil_required, is_active, card_name, baseline_price_cents, notification_rule, wishlists!inner(user_id, profiles!inner(telegram_chat_id))',
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

  // Flatten the join result to get user_id and telegram_chat_id at the top level
  const cards: MonitoredCardRow[] = activeCards.map((row: Record<string, unknown>) => {
    const wishlists = row.wishlists as {
      user_id: string;
      profiles: { telegram_chat_id: number | null } | null;
    } | null;
    return {
      id: row.id as string,
      blueprint_id: row.blueprint_id as number,
      only_zero: row.only_zero as boolean,
      condition_required: row.condition_required as string | null,
      language_required: row.language_required as string | null,
      foil_required: row.foil_required as boolean | null,
      is_active: row.is_active as boolean,
      user_id: wishlists?.user_id ?? '',
      card_name: (row.card_name as string) ?? '',
      baseline_price_cents: (row.baseline_price_cents as number | null) ?? null,
      notification_rule: row.notification_rule ?? null,
      telegram_chat_id: wishlists?.profiles?.telegram_chat_id ?? null,
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

  // 7. Check for Telegram bot token
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  let notificationsSent = 0;
  let notifiedCardCount = 0;

  if (!telegramBotToken) {
    console.log('TELEGRAM_BOT_TOKEN not set, skipping notifications');
  } else {
    // 8. Query recent notifications (last 24h) for cooldown
    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('monitored_card_id, new_price_cents, sent_at')
      .in(
        'monitored_card_id',
        cards.map((c) => c.id),
      )
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false });

    const lastNotifMap = new Map<string, { priceCents: number; sentAt: Date }>();
    if (recentNotifs) {
      for (const n of recentNotifs) {
        const cardId = n.monitored_card_id as string;
        if (!lastNotifMap.has(cardId)) {
          lastNotifMap.set(cardId, {
            priceCents: n.new_price_cents as number,
            sentAt: new Date(n.sent_at as string),
          });
        }
      }
    }

    // Build a map of card ID -> current cheapest price from snapshots
    const currentPriceMap = new Map<string, number>();
    for (const snap of snapshots) {
      currentPriceMap.set(snap.monitored_card_id, snap.price_cents);
    }

    // 9. Evaluate thresholds for each card
    interface AlertWithCardId extends ThresholdAlert {
      cardId: string;
    }

    const alertsByChat = new Map<string, AlertWithCardId[]>();

    for (const card of cards) {
      const rules = Array.isArray(card.notification_rule)
        ? (card.notification_rule as NotificationRule[])
        : [];

      const thresholdRules = rules.filter(
        (r): r is ThresholdRule => r.type === 'threshold' && r.enabled,
      );

      if (thresholdRules.length === 0) continue;

      const currentPrice = currentPriceMap.get(card.id) ?? null;
      if (currentPrice === null) continue;

      if (!card.telegram_chat_id) continue;

      const lastNotif = lastNotifMap.get(card.id) ?? null;

      for (const rule of thresholdRules) {
        const result = shouldNotify(rule, card.baseline_price_cents, currentPrice, lastNotif);
        if (result.triggered) {
          const chatKey = String(card.telegram_chat_id);
          const alert: AlertWithCardId = {
            cardId: card.id,
            cardName: card.card_name,
            blueprintId: card.blueprint_id,
            oldPriceCents: result.comparisonPriceCents ?? 0,
            newPriceCents: currentPrice,
            percentChange: result.percentChange,
          };

          const existing = alertsByChat.get(chatKey) ?? [];
          // Avoid duplicate alerts for the same card (multiple rules)
          if (!existing.some((a) => a.cardId === card.id)) {
            existing.push(alert);
            alertsByChat.set(chatKey, existing);
          }
          break; // One alert per card is enough
        }
      }
    }

    // 10. Send Telegram messages grouped by user
    const allSentAlerts: Array<AlertWithCardId & { telegramMessageId: string | null }> = [];

    for (const [chatId, alerts] of alertsByChat) {
      const message = formatAlertMessage(alerts);

      // Split long messages into chunks
      const chunks: string[] = [];
      if (message.length <= 4000) {
        chunks.push(message);
      } else {
        const lines = message.split('\n');
        let chunk = '';
        for (const line of lines) {
          if (chunk.length + line.length + 1 > 4000) {
            chunks.push(chunk);
            chunk = '';
          }
          chunk = chunk ? `${chunk}\n${line}` : line;
        }
        if (chunk) chunks.push(chunk);
      }

      for (const chunk of chunks) {
        const sendResult = await sendTelegramMessage(telegramBotToken, chatId, chunk);
        if (sendResult.ok) {
          notificationsSent++;
          for (const alert of alerts) {
            allSentAlerts.push({
              ...alert,
              telegramMessageId: sendResult.messageId,
            });
          }
        } else {
          console.warn(`Failed to send Telegram message to chat ${chatId}: ${sendResult.error}`);
        }
      }

      notifiedCardCount += alerts.length;
    }

    // 11. Log notifications to database
    if (allSentAlerts.length > 0) {
      const notifRows = allSentAlerts.map((alert) => ({
        monitored_card_id: alert.cardId,
        notification_type: 'threshold',
        old_price_cents: alert.oldPriceCents,
        new_price_cents: alert.newPriceCents,
        sent_at: new Date().toISOString(),
        telegram_message_id: alert.telegramMessageId ?? null,
      }));

      const { error: notifInsertError } = await supabase.from('notifications').insert(notifRows);

      if (notifInsertError) {
        console.error('Failed to insert notifications:', notifInsertError.message);
      }
    }
  }

  // 12. Log summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `Price fetch complete: ${snapshots.length} snapshots, ${notificationsSent} notifications sent for ${notifiedCardCount} cards (${uniqueBlueprintIds.length} blueprints queried, ${failedCount} failed) in ${elapsed}s`,
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
