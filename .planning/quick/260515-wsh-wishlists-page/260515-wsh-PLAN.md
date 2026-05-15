---
quick_id: 260515-wsh
slug: wishlists-page
description: Add a Wishlists page (list, delete, CardTrader link) and move the import form there; dashboard keeps the full empty-state form only when no wishlists exist
date: 2026-05-15
status: complete
must_haves:
  truths:
    - New `Wishlists` nav item appears between Dashboard and Settings (desktop + mobile)
    - New `/wishlists` route is protected and uses AuthenticatedLayout
    - WishlistsPage lists every wishlist owned by the current user with: name (as link), card count, last_synced_at, delete button
    - Wishlist name link opens `https://www.cardtrader.com/wishlists/<cardtrader_wishlist_id>` in a new tab with rel="noopener noreferrer"
    - Delete uses inline click-to-confirm (first click swaps button to "Confirm delete?" with auto-revert after ~4s); confirming deletes the wishlist row — monitored_cards cascade automatically
    - Compact ImportWishlistForm is rendered at the top of WishlistsPage when at least one wishlist exists
    - Empty state on WishlistsPage (zero wishlists) renders the full ImportWishlistForm
    - Dashboard renders the full ImportWishlistForm only when the user has zero wishlists; otherwise dashboard shows just the card grid (compact form removed)
  artifacts:
    - src/pages/WishlistsPage.tsx (new)
    - src/App.tsx (modified)
    - src/components/Navbar.tsx (modified)
    - src/pages/DashboardPage.tsx (modified)
---

# Quick Task 260515-wsh: Wishlists Page + Move Import Form

## Task 1: Add `/wishlists` route and Wishlists nav item

**Files:** `src/App.tsx`, `src/components/Navbar.tsx`

**Action:**
- In `App.tsx`, import `WishlistsPage` and add a `<Route path="/wishlists" ...>` that mirrors the existing `/dashboard` route (ProtectedRoute → AuthenticatedLayout → WishlistsPage).
- In `Navbar.tsx`, add a Wishlists link between Dashboard and Settings in both the desktop nav and the mobile menu. Use the same `navLinkClass('/wishlists')` styling pattern as the other links.

**Done:** Visiting `/wishlists` (logged in) loads the new page; the Wishlists tab is highlighted on that route.

---

## Task 2: Create `WishlistsPage`

**Files:** `src/pages/WishlistsPage.tsx` (new)

**Action:**
- Fetch `wishlists` (id, cardtrader_wishlist_id, name, last_synced_at, created_at) — RLS scopes to current user. In parallel, fetch a card-count map from `monitored_cards` (`wishlist_id`, count). Use `supabase.from('monitored_cards').select('wishlist_id')` and aggregate client-side (simplest; max 2 wishlists so cheap).
- Render layout:
  - Empty (zero wishlists): full `<ImportWishlistForm onImportComplete={refresh} />`
  - Non-empty: `<ImportWishlistForm onImportComplete={refresh} compact />` followed by a `<ul>` of wishlist rows.
- Each row shows: external link icon + wishlist name (anchor → CardTrader URL, `target="_blank"`, `rel="noopener noreferrer"`), card count, last-synced date if present, delete button on the right.
- Delete UX: `pendingDeleteId` state. First click on a wishlist's delete button sets `pendingDeleteId = w.id` and starts a 4s `setTimeout` that resets it. Second click while pending performs the delete via `supabase.from('wishlists').delete().eq('id', w.id)`. After success, refetch.
- Show inline error if delete fails. Show loading spinner while initial fetch is in-flight (mirror DashboardPage spinner).

**Done:** Page renders the list, link opens new tab, delete confirms inline and cascades.

---

## Task 3: Strip compact import form from Dashboard

**Files:** `src/pages/DashboardPage.tsx`

**Action:**
- Remove the `<ImportWishlistForm ... compact />` block from the non-empty render path (lines around 217–219).
- Keep the existing empty-state behavior: when `cards.length === 0` and settings are complete, render the full `<ImportWishlistForm />`. This preserves the original "if no wishlists, show input in dashboard" rule.
- Remove the now-unused `handleImportComplete` only if no other call site remains. (The empty-state path still uses it.)

**Done:** Dashboard with cards renders only `CardList`; empty dashboard still shows the full import form.

---

## Verification

- `npm run build` (tsc + vite build) succeeds.
- `npm run check` (biome) passes.
- Manual: with 0 wishlists → dashboard shows full form; with 1 wishlist → dashboard shows only cards; `/wishlists` lists the wishlist, name opens new tab, delete inline-confirms then removes it.
