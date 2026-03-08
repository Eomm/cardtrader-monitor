# Phase 6: Chores and Fixes - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish and harden the completed v1. Fix lint violations, improve card detail page UX, add a public "How it works" page, enforce wishlist limits, update the color palette to dark modern, add a footer, normalize the expansion schema, update docs, and improve developer experience.

</domain>

<decisions>
## Implementation Decisions

### Color palette
- Switch from current custom palette (deep-space/papaya/flag-red/steel/molten) to dark modern theme
- Use Tailwind slate scale: background slate-900, surface slate-800, border slate-700
- Text: slate-100 primary, slate-400 muted
- Accent: blue-500 for actions/links
- Semantic: emerald-500 success (price drop), red-500 danger (price rise, destructive actions)
- Update all components to use new palette consistently

### Card detail page improvements
- Add wishlist name to properties section, displayed as a link to the wishlist page on CardTrader
- Notification rules section: add a ? icon that links to the "How it works" page (rules explanation section)
- New "Danger zone" section at bottom of detail page, move "Stop Monitoring" button there
- Keep existing inline confirmation pattern for Stop Monitoring

### Wishlist limit
- Maximum 2 wishlists per user
- Server-side validation only: Edge Function rejects import when user already has 2 wishlists
- Return clear error message to the client

### Public "How it works" page
- Public landing page at /how-it-works, accessible without login
- Content sections:
  1. How to setup: CardTrader API key and Telegram bot chat ID
  2. How price change detection works
  3. How notification rules work (threshold mechanism)
  4. Current limits: max 2 wishlists per user, no max card limit, invite-only subscription
- Acts as a shareable page to explain the product to friends

### Footer
- "made with ❤️ by Eomm" linking to https://github.com/Eomm
- Present on all pages

### Database schema change
- Rename `expansion_name` column in `monitored_cards` to `expansion_id`
- Create `ct_expansions` table and add foreign key
- No migration needed — database will be reset
- Update all code referencing the old column name

### Documentation
- Update docs/ folder with installation guide
- Include manual steps: OAuth configuration with Google via Supabase
- Developer-focused setup instructions

### Lint cleanup
- Fix all 16 Biome errors: formatting, import ordering, noNonNullAssertion
- Affected files: scripts (fetch-prices, sync-wishlists, cleanup-snapshots), components (CardRow, RuleEditor), pages (DashboardPage, SettingsPage), tests, and lib/telegram-utils

### Claude's Discretion
- "How it works" page layout and visual design (within dark modern palette)
- Footer positioning and styling
- Exact tooltip/icon design for rules help link
- Danger zone visual treatment
- docs/ folder structure and format

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/RuleEditor.tsx`: Notification rules UI — needs ? icon addition
- `src/pages/CardDetailPage.tsx`: Card detail — needs wishlist link, danger zone section
- `src/components/Navbar.tsx`: App shell — footer could be added at App.tsx level
- `src/index.css`: Theme definition with @theme block — palette changes go here
- `supabase/functions/import-wishlist/`: Edge Function — add wishlist count validation

### Established Patterns
- Tailwind v4 with @theme custom properties for colors
- Inline confirmation pattern (no browser dialogs) for destructive actions
- React Router hash routing for GitHub Pages SPA
- Supabase Edge Functions for server-side operations

### Integration Points
- All components reference current color names (deep-space, papaya, steel, etc.) — must update everywhere
- CardDetailPage properties section for wishlist link addition
- App.tsx router for new /how-it-works public route
- supabase/migrations/ for new ct_expansions table and column rename

</code_context>

<specifics>
## Specific Ideas

- Footer link: "made with ❤️ by Eomm" → https://github.com/Eomm
- Rules ? icon should link to the specific section on the "How it works" page (anchor link)
- Dark modern palette inspired by Linear/GitHub Dark aesthetic

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-chores-and-fixes*
*Context gathered: 2026-03-08*
