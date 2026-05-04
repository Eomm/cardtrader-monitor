---
quick_id: 260504-bj6
status: complete
date: 2026-05-04
commit: 40f36a9
---

# Summary: 260504-bj6

## What was done
- Added Min and Max price columns to the price section, after the Change column
- Min column title includes the oldest snapshot date from priceHistory
- Added "Set current as Baseline" button below the price chart
- Button updates monitored_cards.baseline_price_cents and refreshes local state optimistically

## Files changed
- src/pages/CardDetailPage.tsx
