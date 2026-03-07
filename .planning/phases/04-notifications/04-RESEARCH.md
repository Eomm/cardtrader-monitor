# Phase 4: Notifications - Research

**Researched:** 2026-03-07
**Domain:** Telegram Bot API integration, threshold evaluation logic, Supabase Edge Functions
**Confidence:** HIGH

## Summary

Phase 4 integrates Telegram notifications into the existing hourly price fetch job. The core work breaks into four areas: (1) a Supabase Edge Function for the Telegram bot webhook (handles `/start` and test messages), (2) threshold evaluation logic added to `scripts/fetch-prices.ts`, (3) Telegram message sending from the GitHub Actions job, and (4) a Telegram settings section on the existing SettingsPage.

The Telegram Bot API is straightforward HTTP -- `POST https://api.telegram.org/bot<TOKEN>/sendMessage` with JSON body. The main complexity is MarkdownV2 escaping (18 special characters) and the 24-hour cooldown logic with re-evaluation against last notified price. All infrastructure (database tables, columns, workflows) already exists; this phase is primarily application logic.

**Primary recommendation:** Use the Telegram Bot API directly via `fetch()` -- no SDK needed. Keep all notification logic in `scripts/fetch-prices.ts` (Node.js, runs in GitHub Actions). The Edge Function only handles bot webhook for `/start` replies and test message sending from the Settings page.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Minimal bot approach: user sends /start to the bot, copies their chat ID from the bot's reply, pastes it in the Settings page
- No webhook-based link token flow in v1 -- manual chat ID input only
- Telegram chat ID input lives in the Settings page, below the existing API token section
- On save, send a test message via the bot to confirm the connection works
- Telegram bot token stored in both Supabase Edge Function env var (for test message on save) and GitHub Actions secret (for price job notifications)
- The Telegram bot webhook points to a public Supabase Edge Function (no JWT verification)
- Rich Telegram MarkdownV2 formatting
- Messages in English
- Multiple triggered cards grouped into a single message
- Format per card line: emoji (green circle for drop, red circle for rise), card name as clickable link to CardTrader listing, old price arrow new price
- 24-hour cooldown after an alert fires for a card
- During cooldown, re-evaluate threshold against last notified price instead of original baseline
- If price moved enough from last alert price, bypass cooldown and send new alert
- RULE-03: compare cheapest matching price against baseline price
- Only evaluate enabled threshold rules (skip disabled rules)
- Respect direction strictly: down only fires on drops, up only on rises, both fires on either
- No offers in marketplace (null price) = skip threshold evaluation silently
- Null baseline price = treat as infinity, so any actual price triggers a drop alert
- Stability rules are NOT evaluated in this phase -- only threshold rules

### Claude's Discretion
- Test message content and formatting
- Edge Function implementation details for test message endpoint
- Exact MarkdownV2 escaping approach
- How the bot replies to /start (message showing the user's chat ID)
- Error handling when Telegram API is unreachable during price job
- Settings page UI details for the Telegram section (input validation, save confirmation pattern)

### Deferred Ideas (OUT OF SCOPE)
- NOTF-05: Telegram connection flow via /start token link (v2 -- smoother UX for connecting accounts)
- NOTF-06: Inline Telegram button to reset baseline price from notification (v2)
- Stability rule evaluation -- types exist but evaluation logic is not part of this phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RULE-03 | Threshold alert evaluates current cheapest matching price vs baseline price | Threshold evaluation logic section; cheapest price already computed in fetch-prices.ts via `findCheapestPrice` |
| NOTF-01 | User receives a Telegram message when a threshold alert triggers | Telegram Bot API sendMessage; message sending integrated into fetch-prices.ts |
| NOTF-02 | Telegram notification includes card name, old price, new price, and percentage change | MarkdownV2 formatting section; message template pattern |
| NOTF-03 | Telegram notification includes a direct link to the CardTrader listing | CardTrader URL pattern: `https://www.cardtrader.com/en/cards/{blueprint_id}` |
| NOTF-04 | Sent notifications are logged in the database | Existing `notifications` table with all needed columns |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Telegram Bot API | current | Send messages, receive webhook updates | Direct HTTP API, no SDK overhead needed |
| Supabase Edge Functions (Deno) | current | Bot webhook endpoint, test message endpoint | Already used for import-wishlist; established pattern |
| Node.js fetch | built-in | Send Telegram messages from GitHub Actions job | Already used in fetch-prices.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.0.0 | DB reads/writes in fetch-prices.ts | Already installed, used for notifications table |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw fetch | node-telegram-bot-api / telegraf | Overkill -- only need sendMessage; adds dependency for 5 lines of code |
| Supabase Edge Function for webhook | External webhook service | Edge Function is free and already used in project |

**Installation:**
No new packages needed. Telegram Bot API is plain HTTP.

## Architecture Patterns

### Recommended Project Structure
```
scripts/
  fetch-prices.ts          # ADD: threshold evaluation + notification sending after price snapshots
supabase/functions/
  telegram-webhook/
    index.ts               # NEW: handles /start command replies
  send-test-message/
    index.ts               # NEW: sends test message when user saves chat ID (called from Settings page)
  _shared/
    telegram.ts            # NEW: shared Telegram API helpers (sendMessage, escapeMarkdownV2)
src/
  pages/
    SettingsPage.tsx        # MODIFY: add Telegram chat ID section below API token
  lib/
    telegram-utils.ts      # NEW: MarkdownV2 escaping, message formatting (shared between scripts/ and src/)
```

### Pattern 1: Threshold Evaluation Flow
**What:** After price snapshots are created in fetch-prices.ts, evaluate each card's threshold rules against the new price.
**When to use:** Every hourly price fetch run.
**Example:**
```typescript
// In fetch-prices.ts, after snapshot insertion (step 6)

interface ThresholdAlert {
  card: MonitoredCardRow;       // extended with notification_rule, baseline_price_cents, card_name
  oldPriceCents: number;        // baseline or last notified price
  newPriceCents: number;        // current cheapest price
  percentChange: number;        // calculated percentage
  blueprintId: number;
}

function evaluateThreshold(
  rule: ThresholdRule,
  baselineCents: number | null,  // null = treat as Infinity
  currentCents: number | null,   // null = skip (no offers)
): { triggered: boolean; percentChange: number } {
  if (currentCents === null) return { triggered: false, percentChange: 0 };

  // Null baseline = treat as infinity, any price is a drop
  if (baselineCents === null) {
    return { triggered: rule.direction !== 'up', percentChange: -100 };
  }

  const percentChange = ((currentCents - baselineCents) / baselineCents) * 100;
  const absChange = Math.abs(percentChange);

  if (absChange < rule.threshold_percent) return { triggered: false, percentChange };

  // Check direction
  if (rule.direction === 'down' && percentChange >= 0) return { triggered: false, percentChange };
  if (rule.direction === 'up' && percentChange <= 0) return { triggered: false, percentChange };

  return { triggered: true, percentChange };
}
```

### Pattern 2: Cooldown with Re-evaluation
**What:** After a notification fires, 24h cooldown applies. During cooldown, compare against last notified price instead of baseline.
**When to use:** Every threshold evaluation.
**Example:**
```typescript
// Query last notification for each card
const { data: recentNotifications } = await supabase
  .from('notifications')
  .select('monitored_card_id, new_price_cents, sent_at')
  .in('monitored_card_id', cardIds)
  .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .order('sent_at', { ascending: false });

// Build map: card_id -> last notification
const lastNotifMap = new Map<string, { price: number; sentAt: Date }>();
for (const n of recentNotifications ?? []) {
  if (!lastNotifMap.has(n.monitored_card_id)) {
    lastNotifMap.set(n.monitored_card_id, {
      price: n.new_price_cents,
      sentAt: new Date(n.sent_at),
    });
  }
}

// For each card: if within cooldown, use last notified price as comparison baseline
// If threshold triggers against that price, bypass cooldown
```

### Pattern 3: Telegram sendMessage via fetch
**What:** Send MarkdownV2-formatted message to a Telegram chat.
**When to use:** From both Node.js (fetch-prices.ts) and Deno (Edge Functions).
**Example:**
```typescript
const TELEGRAM_API = 'https://api.telegram.org/bot';

async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  parseMode: 'MarkdownV2' | 'HTML' = 'MarkdownV2',
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      link_preview_options: { is_disabled: true },
    }),
  });
  const data = await res.json();
  if (data.ok) {
    return { ok: true, messageId: String(data.result.message_id) };
  }
  return { ok: false, error: data.description ?? 'Unknown error' };
}
```

### Pattern 4: Edge Function for Telegram Webhook
**What:** Receives webhook updates from Telegram when users send /start to the bot.
**When to use:** Bot setup -- the webhook URL is registered once via `setWebhook`.
**Example:**
```typescript
// supabase/functions/telegram-webhook/index.ts
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  const update = await req.json();
  const message = update.message;
  if (!message?.text?.startsWith('/start')) {
    return new Response('OK', { status: 200 });
  }

  const chatId = message.chat.id;
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';

  // Reply with the user's chat ID
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `Your chat ID is: \`${chatId}\`\n\nCopy this number and paste it in the CardTrader Monitor settings page to connect notifications.`,
      parse_mode: 'MarkdownV2',
    }),
  });

  return new Response('OK', { status: 200 });
});
```

### Anti-Patterns to Avoid
- **Sending one message per card:** Group all triggered alerts for a user into a single message. Telegram rate-limits individual chats to ~30 messages/second but grouping is better UX.
- **Using HTML parse_mode for links with special characters:** MarkdownV2 is the user's locked decision. Use proper escaping.
- **Evaluating disabled rules:** Always check `rule.enabled` before any threshold computation.
- **Sending notifications without logging:** Always insert into `notifications` table before (or atomically with) the Telegram send, so failures are traceable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MarkdownV2 escaping | Ad-hoc string replacement | Dedicated `escapeMarkdownV2()` function with all 18 characters | Missing one character silently breaks formatting in production |
| Telegram API wrapper | Full bot framework | Simple `sendTelegramMessage()` helper | Only need sendMessage; frameworks add complexity for no benefit |
| Webhook signature verification | Custom crypto | Nothing -- Telegram webhooks don't use HMAC signatures | Telegram secures via secret webhook URL path |

**Key insight:** The Telegram Bot API is simple enough that a raw `fetch()` wrapper is the right level of abstraction. The real complexity is in the escaping and the threshold evaluation logic, not the HTTP calls.

## Common Pitfalls

### Pitfall 1: MarkdownV2 Escaping
**What goes wrong:** Telegram returns 400 "Bad Request: can't parse entities" when special characters appear in card names or prices.
**Why it happens:** MarkdownV2 requires escaping 18 characters: `_`, `*`, `[`, `]`, `(`, `)`, `~`, `` ` ``, `>`, `#`, `+`, `-`, `=`, `|`, `{`, `}`, `.`, `!`
**How to avoid:** Escape ALL text content that is not intentional formatting markup. Inside `[link text](url)`, the link text and URL have different escaping rules -- inside URLs, only `)` and `\` need escaping.
**Warning signs:** Messages fail to send or render with broken formatting.

### Pitfall 2: Telegram chat_id Type
**What goes wrong:** `chat_id` is a `bigint` in the DB but Telegram API accepts both number and string.
**Why it happens:** JavaScript `Number` can lose precision for very large chat IDs (group chats can have negative IDs like -100...).
**How to avoid:** Store as `bigint` in Postgres (already done), pass as string to Telegram API. The `profiles.telegram_chat_id` column is already `bigint`.
**Warning signs:** Wrong chat receives the message, or API returns "chat not found."

### Pitfall 3: Cooldown Edge Case -- First Notification
**What goes wrong:** Logic incorrectly checks for cooldown when no notification has ever been sent.
**Why it happens:** No row in `notifications` table means no cooldown applies and baseline should be used.
**How to avoid:** Default to baseline comparison when no recent notification exists.
**Warning signs:** First alert for a card never fires.

### Pitfall 4: Percentage Calculation with Null Baseline
**What goes wrong:** Division by zero or NaN when baseline is null.
**Why it happens:** Cards imported with no marketplace offers have `baseline_price_cents = NULL`.
**How to avoid:** User decision: null baseline = treat as infinity. Any actual price is a "drop from infinity" -- set percentage to -100 and trigger if direction allows drops.
**Warning signs:** TypeError in production logs.

### Pitfall 5: Message Length Limit
**What goes wrong:** Telegram rejects messages over 4096 characters.
**Why it happens:** User has many monitored cards that all trigger at once.
**How to avoid:** Split alerts into multiple messages if grouped text exceeds ~4000 characters.
**Warning signs:** sendMessage returns 400 with "message is too long."

### Pitfall 6: Supabase Edge Function Public Access
**What goes wrong:** Edge Function returns 401 for Telegram webhook calls.
**Why it happens:** Default JWT verification is enabled.
**How to avoid:** Per project memory: set `Verify JWT with legacy secret` to **false** in Supabase dashboard for the telegram-webhook function. The send-test-message function should use JWT verification (called from authenticated frontend).
**Warning signs:** Webhook never receives updates.

## Code Examples

### MarkdownV2 Escape Function
```typescript
// Source: Telegram Bot API official docs
const MARKDOWN_V2_SPECIAL = /[_*[\]()~`>#+\-=|{}.!\\]/g;

function escapeMarkdownV2(text: string): string {
  return text.replace(MARKDOWN_V2_SPECIAL, '\\$&');
}

// Inside link text: same escaping applies
// Inside link URL: only ) and \ need escaping
function escapeMarkdownV2Url(url: string): string {
  return url.replace(/[)\\]/g, '\\$&');
}
```

### Notification Message Formatting
```typescript
// Per user decision: one line per card, grouped message
function formatAlertMessage(alerts: ThresholdAlert[]): string {
  const lines = alerts.map((alert) => {
    const emoji = alert.percentChange < 0 ? '\u{1F7E2}' : '\u{1F534}'; // green/red circle
    const cardName = escapeMarkdownV2(alert.card.card_name);
    const url = escapeMarkdownV2Url(
      `https://www.cardtrader.com/en/cards/${alert.blueprintId}`
    );
    const oldPrice = escapeMarkdownV2(formatEurCents(alert.oldPriceCents));
    const newPrice = escapeMarkdownV2(formatEurCents(alert.newPriceCents));
    const pct = escapeMarkdownV2(`${Math.abs(alert.percentChange).toFixed(1)}%`);
    return `${emoji} [${cardName}](${url}) ${oldPrice} \\-> ${newPrice} \\(${pct}\\)`;
  });
  return lines.join('\n');
}

function formatEurCents(cents: number): string {
  return `\u20AC${(cents / 100).toFixed(2)}`; // e.g. "EUR17.27"
}
```

### Saving Telegram Chat ID (Frontend)
```typescript
// In SettingsPage.tsx -- call Edge Function to send test message
const handleSaveTelegramId = async (chatId: string) => {
  // 1. Save chat ID to profile
  const { error: saveError } = await supabase
    .from('profiles')
    .update({ telegram_chat_id: chatId })
    .eq('id', user.id);

  if (saveError) {
    setMessage({ type: 'error', text: 'Failed to save Telegram chat ID' });
    return;
  }

  // 2. Send test message via Edge Function
  const { data, error } = await supabase.functions.invoke('send-test-message', {
    body: { chat_id: chatId },
  });

  if (error || !data?.ok) {
    setMessage({ type: 'error', text: 'Chat ID saved but test message failed. Check the ID.' });
    return;
  }

  setMessage({ type: 'success', text: 'Connected! Check your Telegram for a test message.' });
};
```

### Querying Cards with Rules for Threshold Evaluation
```typescript
// Extended query in fetch-prices.ts to include notification_rule and baseline
const { data: activeCards } = await supabase
  .from('monitored_cards')
  .select(
    'id, blueprint_id, only_zero, condition_required, language_required, foil_required, is_active, card_name, baseline_price_cents, notification_rule, wishlists!inner(user_id)'
  )
  .eq('is_active', true);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Telegram Markdown (v1) | MarkdownV2 | Bot API 4.5 (2019) | Must use MarkdownV2 parse_mode; old Markdown deprecated |
| setWebhook requires domain verification | setWebhook to any HTTPS URL | Always | Supabase Edge Function URL works directly |
| Bot token in URL path for webhooks | Bot token still in URL path | Current | Security via obscurity -- keep webhook URL secret |

**Deprecated/outdated:**
- `parse_mode: "Markdown"` (v1): Limited formatting, deprecated in favor of MarkdownV2
- `disable_web_page_preview` parameter: Replaced by `link_preview_options` object

## Open Questions

1. **CardTrader card URL format**
   - What we know: URLs follow `https://www.cardtrader.com/en/cards/{id}` pattern where id appears to be blueprint_id or a slug
   - What's unclear: Whether blueprint_id alone works as the URL path, or if a slug is required
   - Recommendation: Test with `https://www.cardtrader.com/en/cards/{blueprint_id}` during implementation. If it doesn't resolve, the URL might need a slug format. Fallback: construct URL from card name + expansion as slug.

2. **Telegram webhook URL registration**
   - What we know: Must call `setWebhook` once to point Telegram at the Edge Function URL
   - What's unclear: Whether this should be a manual one-time setup step or automated
   - Recommendation: Document as a manual setup step (call `setWebhook` API once via curl). Not worth automating for a single bot.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RULE-03 | Threshold evaluates current vs baseline price | unit | `npx vitest run tests/threshold-evaluation.test.ts -t "evaluates" --reporter=verbose` | No -- Wave 0 |
| RULE-03 | Null baseline treated as infinity (any price = drop) | unit | `npx vitest run tests/threshold-evaluation.test.ts -t "null baseline" --reporter=verbose` | No -- Wave 0 |
| RULE-03 | Direction filtering (up/down/both) | unit | `npx vitest run tests/threshold-evaluation.test.ts -t "direction" --reporter=verbose` | No -- Wave 0 |
| RULE-03 | Disabled rules skipped | unit | `npx vitest run tests/threshold-evaluation.test.ts -t "disabled" --reporter=verbose` | No -- Wave 0 |
| NOTF-01 | Telegram message sent when threshold triggers | integration | manual-only -- requires live Telegram bot | N/A |
| NOTF-02 | Message includes card name, old/new price, percentage | unit | `npx vitest run tests/notification-message.test.ts -t "format" --reporter=verbose` | No -- Wave 0 |
| NOTF-03 | Message includes CardTrader listing link | unit | `npx vitest run tests/notification-message.test.ts -t "link" --reporter=verbose` | No -- Wave 0 |
| NOTF-04 | Notifications logged in database | integration | manual-only -- requires Supabase connection | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/threshold-evaluation.test.ts` -- covers RULE-03 (threshold logic, direction, null baseline, disabled rules)
- [ ] `tests/notification-message.test.ts` -- covers NOTF-02, NOTF-03 (message formatting, MarkdownV2 escaping, link generation)
- [ ] `tests/cooldown.test.ts` -- covers cooldown logic (24h window, re-evaluation against last notified price)

## Sources

### Primary (HIGH confidence)
- [Telegram Bot API official docs](https://core.telegram.org/bots/api) - sendMessage, MarkdownV2 formatting, webhook setup
- Existing codebase: `scripts/fetch-prices.ts`, `supabase/migrations/00001_initial_schema.sql`, `supabase/functions/import-wishlist/index.ts`
- Existing codebase: `src/lib/cardtrader-types.ts` (ThresholdRule, NotificationRule types)

### Secondary (MEDIUM confidence)
- [CardTrader card URLs](https://www.cardtrader.com/en/cards/312650) - URL pattern observed from search results

### Tertiary (LOW confidence)
- CardTrader card URL using blueprint_id directly -- needs live validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Telegram Bot API is well-documented, no external libraries needed
- Architecture: HIGH - extends existing patterns (fetch-prices.ts, Edge Functions, SettingsPage)
- Pitfalls: HIGH - MarkdownV2 escaping rules are well-documented, cooldown logic is clearly specified by user
- CardTrader URL format: LOW - needs runtime validation

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable APIs, unlikely to change)
