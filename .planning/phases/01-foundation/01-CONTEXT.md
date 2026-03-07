# Phase 1: Foundation - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can sign in with Google OAuth, configure their CardTrader API credentials, and see an empty dashboard — all deployed and running on free-tier infrastructure (GitHub Pages + Supabase). Includes database schema for the full application, Biome linting/formatting in CI, and deployment pipeline.

</domain>

<decisions>
## Implementation Decisions

### Navigation & page structure
- Top navbar with logo + nav links (Dashboard, Settings) + user avatar dropdown on the right
- 3 pages in Phase 1: Login/landing page, Dashboard (empty state placeholder), Settings
- React Router with history-based routing (clean URLs like /dashboard, /settings)
- 404.html workaround for GitHub Pages SPA support (redirect to index.html)
- Avatar dropdown in top-right corner shows user email and logout option

### Color scheme & visual identity
- Follow system preference (OS dark/light mode) as default, using CSS `prefers-color-scheme`
- 5-color palette applied via Tailwind CSS custom theme:

| Color | Hex | Role |
|-------|-----|------|
| Deep Space Blue | `#003049` | Dark mode background, primary color |
| Papaya Whip | `#fdf0d5` | Light mode background |
| Flag Red | `#c1121f` | Primary accent, CTAs, active nav states |
| Steel Blue | `#669bbc` | Secondary buttons, card borders, dividers |
| Molten Lava | `#780000` | Destructive actions, critical alerts |

### Claude's Discretion
- Login/landing page layout and design (what unauthenticated users see)
- Settings page UX details (token input show/hide, validation feedback, save confirmation)
- Empty dashboard state appearance (onboarding prompt, illustration, messaging)
- Typography choices and spacing
- Loading states and error handling patterns
- Mobile responsive behavior within the top navbar pattern

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- Tech stack locked: React + Vite + Tailwind CSS for frontend
- Supabase for auth (Google OAuth), database (Postgres + RLS), and Edge Functions (Deno)
- GitHub Pages for hosting, GitHub Actions for CI/CD
- Design doc at `docs/plans/2026-02-01-cardtrader-monitor-design.md` has full DB schema, RLS policies, and API token encryption approach (pgcrypto)

### Integration Points
- Supabase Auth for Google OAuth sign-in flow
- Supabase client (`@supabase/supabase-js`) for database operations
- GitHub Actions workflow for deploying to GitHub Pages on push to main
- Biome for linting/formatting in CI pipeline

</code_context>

<specifics>
## Specific Ideas

- User provided a curated 5-color palette with specific hex values and named roles — this should be configured as the Tailwind theme, not ad-hoc color usage
- System preference for dark/light mode (not a manual toggle in Phase 1)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-07*
