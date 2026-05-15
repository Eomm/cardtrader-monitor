---
quick_id: 260515-wsh
status: complete
date: 2026-05-15
commit: 3cb4cb4
---

# Summary: 260515-wsh

## What was done
- Added `/wishlists` route (protected, AuthenticatedLayout) and a Wishlists nav link in desktop + mobile menus
- New `WishlistsPage` lists each wishlist with card count and last_synced_at, links the name to `cardtrader.com/wishlists/<id>` in a new tab (`rel="noopener noreferrer"`), and exposes inline click-to-confirm delete (4s auto-revert) — `monitored_cards` cascade via the existing FK
- Moved compact `ImportWishlistForm` from Dashboard to the top of `/wishlists`; when the user has zero wishlists, `/wishlists` falls back to the full form
- Dashboard now renders only the card grid when wishlists exist; the original empty-state full form is preserved

## Files changed
- src/pages/WishlistsPage.tsx (new)
- src/App.tsx
- src/components/Navbar.tsx
- src/pages/DashboardPage.tsx

## Notes
- Card counts fetched client-side (max 2 wishlists per user — schema-enforced)
- No DB or RLS changes — existing `wishlists_delete` policy + `ON DELETE CASCADE` on `monitored_cards` already cover the delete path
