# Feature Landscape

**Domain:** Trading card price monitoring (MTG / TCG focus, CardTrader marketplace)
**Researched:** 2026-03-07
**Confidence:** MEDIUM (based on training data knowledge of MTGGoldfish, TCGPlayer, Scryfall, EchoMTG, CardConduit; web verification was unavailable)

## Competitive Landscape Summary

The trading card price monitoring space has several established players, each with different strengths:

- **MTGGoldfish**: Gold standard for MTG price history charts, metagame data, deck pricing. Offers price alerts on premium tier. Covers TCGPlayer/CardKingdom/MTGO prices.
- **TCGPlayer**: Marketplace-integrated wishlist with basic price alerts (notify when card drops below X). Massive product catalog.
- **Scryfall**: Best card search/data API. No price alerts or monitoring -- it is a reference tool, not a tracker.
- **EchoMTG**: Collection-centric. Tracks portfolio value over time, price change notifications, inventory management.
- **CardConduit**: Arbitrage-focused. Cross-marketplace price comparison, buylist optimization.
- **Manabox / Archidekt / Moxfield**: Deck builders with basic price awareness but no monitoring.

**CardTrader Monitor's niche**: None of these tools monitor CardTrader marketplace prices specifically. CardTrader has its own ecosystem (CT Zero, European focus, blueprint model) that existing US-centric tools ignore. This is the core differentiator -- users cannot get CardTrader-specific price alerts anywhere else.

---

## Table Stakes

Features users expect from any price monitoring tool. Missing = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Wishlist import from source | Every tool lets you add cards somehow; importing from CardTrader wishlist is the natural entry point | Medium | CardTrader API provides this; already in PROJECT.md |
| Per-card price drop alerts | The fundamental value prop of any price monitor. "Tell me when this card gets cheaper" | Low | Threshold-based: notify when price drops X% from baseline |
| Current price display | Users need to see the current best price for each monitored card at a glance | Low | Dashboard view showing card name, set, current price |
| Card filtering (condition, language, foil) | CardTrader has many variants per card; users care about specific conditions | Medium | Already planned. Critical for CardTrader where NM English vs LP Italian prices differ wildly |
| Manual rule configuration | Users want control over when they get notified, not just defaults | Low | Per-card threshold editing |
| Notification delivery | Alerts are useless without reliable delivery to a channel users check | Low | Telegram is the chosen channel; good fit for small group |
| Authentication / user isolation | Each user's cards and rules are private | Low | Google OAuth + RLS already planned |
| Card identification (image, set, name) | Users need to recognize which card an alert is about | Low | Card image URL + name + expansion from CardTrader API |

## Differentiators

Features that set CardTrader Monitor apart. Not expected by users coming from other tools, but create real value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| CardTrader-specific monitoring | No other tool monitors CardTrader prices. Period. This is the entire reason to exist. | N/A (core) | This is not a feature, it is the product identity |
| Baseline price model with manual reset | MTGGoldfish uses rolling averages; TCGPlayer uses absolute thresholds. Baseline model lets users anchor to "the price when I started caring" and reset after buying. More intuitive for deal-hunting. | Low | Already in PROJECT.md. The reset-from-notification-link is clever UX |
| Stability alerts | "Notify me when price has been stable for N days" -- no competitor offers this. Useful for identifying when a card's price has settled after a spike/crash. | Medium | Unique feature. Requires daily snapshot retention and consecutive-day logic |
| CT Zero filtering | CardTrader Zero is a unique fulfillment program. Filtering to CT0-only listings is CardTrader-specific and valuable for users who want authentication guarantees. | Low | Already planned. No competitor can offer this |
| Telegram as primary channel | Most competitors use email or in-app notifications. Telegram is instant, mobile-native, and supports rich formatting (card images, inline buttons). Better for a small group. | Low | Already planned. Telegram inline keyboards could enable quick actions |
| Price increase alerts | Most tools focus only on drops. Alerting on price increases helps users decide to sell or buy before further increases. | Low | Threshold model already supports bidirectional alerts |
| Daily wishlist auto-sync | Automatic sync means users manage their wishlist on CardTrader (where they already do) and monitoring follows. No duplicate management. | Medium | Already planned. This is a genuine convenience differentiator |
| Notification with direct buy link | Alert message includes a link to the CardTrader listing so users can act immediately | Low | CardTrader product URLs are constructable from blueprint data |
| Baseline reset from notification | When users get an alert and buy the card, they can reset the baseline right from the Telegram notification. Reduces friction. | Medium | Requires Telegram inline button + callback handling in webhook |

## Anti-Features

Features to explicitly NOT build. Either out of scope, harmful to the product, or a maintenance trap.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multi-marketplace price comparison | Scope explosion. Adds TCGPlayer/CardKingdom/MKM APIs, currency conversion, normalization. Different product entirely. | Stay focused on CardTrader. Users who want cross-marketplace use CardConduit. |
| Collection value tracking / portfolio | EchoMTG's domain. Requires inventory management, purchase price tracking, total value calculations. Different product. | This is a wishlist monitor, not a collection manager. |
| Deck building / deck pricing | Moxfield, Archidekt, Manabox already do this well. | Link out to these tools if needed. |
| Price prediction / trend analysis | Requires ML, large historical datasets, and is inherently unreliable. Users will blame you when predictions are wrong. | Show raw price history. Let users draw their own conclusions. |
| Email notifications | Adds SMTP/email service complexity. Small friend group does not need a second notification channel. | Telegram only. If demand grows, add email later. |
| In-app real-time notifications | Requires WebSocket/Realtime infrastructure. SPA on GitHub Pages cannot maintain persistent connections cost-effectively. | Telegram push is the notification channel. Dashboard shows current state on refresh. |
| Mobile app | Massive scope. React Native or Flutter is a separate product. | Web app is mobile-responsive. Telegram handles push notifications. |
| Social features (sharing, public wishlists) | Privacy concerns, moderation burden, feature creep. Small friend group communicates directly. | Out of scope entirely. |
| Price history charts (MVP) | Charting libraries add bundle size, require retained snapshots, and are polish not core. | Defer to post-MVP. Show price history as a simple table/list first. |
| Manual card addition (not from wishlist) | Requires card search, set disambiguation, blueprint resolution. Complex UI for marginal value. | Users add cards to their CardTrader wishlist, sync picks them up. |
| Notification batching / digest mode | Over-engineering for small scale. With <500 cards and hourly checks, notification volume is manageable. | Send individual alerts. Revisit if users complain about volume. |
| Multi-game support beyond what CardTrader offers | CardTrader already supports MTG, Pokemon, Yu-Gi-Oh, etc. The tool inherits this from the wishlist. No extra work needed. | Game support is implicit from CardTrader wishlist contents. |

## Feature Dependencies

```
Google OAuth Auth ─────────────────────────────┐
                                                v
CardTrader API Token Setup ──────> Wishlist Import ──────> Monitored Cards
                                        │                       │
                                        v                       v
                                  Daily Wishlist Sync    Per-Card Rule Config
                                                                │
                                                                v
                              Telegram Bot Setup ──────> Price Check Job
                                        │                       │
                                        v                       v
                              Telegram Connection      Alert Evaluation
                                        │                       │
                                        └───────────> Notification Delivery
                                                                │
                                                                v
                                                   Baseline Reset from Notification
```

Key dependency chains:

1. **Auth -> API Token -> Wishlist Import -> Monitored Cards** (must be sequential in onboarding)
2. **Telegram Setup -> Telegram Connection** (must happen before notifications work)
3. **Monitored Cards + Rules + Price Check Job -> Alert Evaluation -> Notification** (the core loop)
4. **Daily Snapshots -> Stability Alerts** (stability detection requires retained history)
5. **Price History Retention -> Price History Display** (display requires data; retention policy affects what is available)

## MVP Recommendation

### Phase 1: Must Ship (Core Loop)

Prioritize getting the notification loop working end-to-end:

1. **Auth + Settings** - Google OAuth, CardTrader API token input, Telegram connection
2. **Wishlist Import** - Import cards from CardTrader wishlist, store with metadata
3. **Price Check Job** - Hourly fetch of current prices via GitHub Actions
4. **Threshold Alerts** - Price drop/increase vs baseline, with configurable percentage
5. **Telegram Notifications** - Deliver alerts with card name, price change, and buy link
6. **Dashboard** - View monitored cards, current prices, active rules

This is the minimum loop: import cards -> check prices -> send alerts.

### Phase 2: Refinement

7. **Daily Wishlist Sync** - Auto-sync keeps monitored cards in sync
8. **Card Filters** - Condition, language, foil, CT Zero filtering
9. **Stability Alerts** - "Price stable for N days" notifications
10. **Baseline Reset** - Reset from Telegram notification link
11. **Card Detail Page** - View price history, edit rules per card

### Defer to Post-MVP

- **Price history charts** - Nice visual polish but not core value
- **Notification history view** - Log is in the database but displaying it is polish
- **Bulk rule editing** - "Set all cards to 10% threshold" -- convenience, not critical
- **Multiple wishlist support** - Schema supports it, but UI can start with single wishlist

### Rationale

The entire value of this product is the notification loop. A user who imports a wishlist, has prices checked hourly, and gets a Telegram alert when a deal appears -- that user has received the core value. Everything else is optimization. Ship the loop first, then make it better.

## Confidence Notes

| Finding | Confidence | Reason |
|---------|------------|--------|
| Table stakes features | HIGH | Based on direct knowledge of MTGGoldfish, TCGPlayer, EchoMTG feature sets and general price monitoring patterns |
| CardTrader-specific differentiation | HIGH | No known competitor monitors CardTrader prices; this is verifiable from the landscape |
| Stability alerts as unique | MEDIUM | Could not verify every competitor's feature set via web search; may exist in niche tools |
| Anti-features list | HIGH | Based on scope constraints in PROJECT.md and clear product boundaries |
| Feature dependencies | HIGH | Derived from the technical architecture and user flow in the design doc |

## Sources

- PROJECT.md and design document in this repository (primary source for planned features)
- Training data knowledge of MTGGoldfish, TCGPlayer, Scryfall, EchoMTG, CardConduit feature sets (MEDIUM confidence -- could not verify with live web searches)
- CardTrader API capabilities as described in design document
