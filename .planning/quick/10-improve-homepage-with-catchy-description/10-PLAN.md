---
phase: quick-10
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/LoginPage.tsx
  - src/pages/PrivacyPage.tsx
  - src/App.tsx
autonomous: true
requirements: [QUICK-10]
must_haves:
  truths:
    - "Visitor sees a catchy description of what CardTrader Monitor does on the login page"
    - "Visitor sees a beta disclaimer warning the service may be discontinued"
    - "Visitor can navigate to the How It Works page from the login page"
    - "Visitor can navigate to a Privacy page from the login page"
    - "Privacy page exists with meaningful content about data handling"
  artifacts:
    - path: "src/pages/LoginPage.tsx"
      provides: "Enhanced homepage with description, beta badge, and links"
    - path: "src/pages/PrivacyPage.tsx"
      provides: "Privacy policy page"
    - path: "src/App.tsx"
      provides: "Route for /privacy"
---

<objective>
Improve the login/homepage to communicate what CardTrader Monitor does, set expectations about its beta status, and provide links to How It Works and a new Privacy page.

Purpose: First-time visitors currently see only a sign-in button with minimal context. They need to understand the value proposition, know the service is in beta, and have access to detailed information before signing up.
Output: Enhanced LoginPage.tsx, new PrivacyPage.tsx, updated App.tsx routes.
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/LoginPage.tsx
@src/pages/HowItWorksPage.tsx
@src/App.tsx
@src/components/Footer.tsx
</context>

<interfaces>
<!-- Existing patterns to follow -->

From src/pages/HowItWorksPage.tsx (public page pattern):
- Uses `Footer` and conditionally `Navbar` based on auth state
- `min-h-screen flex flex-col bg-slate-900 text-slate-100` layout pattern
- Link back to login when not authenticated

From src/pages/LoginPage.tsx (current homepage):
- Google OAuth sign-in flow (do not modify)
- Dark theme with slate-800 cards, slate-700 borders
- `max-w-md` centered layout

From src/App.tsx:
- Public routes at top level (no ProtectedRoute wrapper)
- HowItWorksPage is an example of a public route pattern
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Enhance LoginPage with description, beta notice, and navigation links</name>
  <files>src/pages/LoginPage.tsx</files>
  <action>
Rework the LoginPage hero and content sections while keeping the Google sign-in card untouched. Changes:

1. **Catchy tagline** -- Replace the current subtitle "Track prices and never miss a deal on the cards you care about." with a punchier two-part message:
   - Main tagline (text-lg text-slate-300): "Stop refreshing CardTrader. Get notified when prices drop on the cards you care about."
   - Below tagline, add 3 short bullet-style feature highlights (text-sm text-slate-400, using simple Unicode check marks): "Import your wishlists", "Set custom price alerts", "Get Telegram notifications"

2. **Beta badge** -- Add a small pill/badge above the h1 title: text "BETA" in uppercase, styled as `inline-block rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1 mb-4`. Below the sign-in card, add a subtle disclaimer (text-xs text-slate-500 text-center mt-4): "This is a beta project. The service may be modified or discontinued at any time."

3. **Navigation links** -- Below the beta disclaimer, add two links side by side (flex gap-4 justify-center mt-3):
   - "How it works" linking to `/how-it-works` (use React Router Link)
   - "Privacy" linking to `/privacy` (use React Router Link)
   Both styled as `text-sm text-blue-500 hover:text-blue-400 underline`.

4. Import `Link` from `react-router` at the top of the file.

Do NOT modify the sign-in card internals (button, error display, "Sign in to import..." text). Only add content around it.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Login page shows catchy description with feature bullets, BETA badge, beta disclaimer, and links to How It Works and Privacy pages. Sign-in functionality unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Create Privacy page and add route</name>
  <files>src/pages/PrivacyPage.tsx, src/App.tsx</files>
  <action>
1. **Create src/pages/PrivacyPage.tsx** following the same layout pattern as HowItWorksPage (public page, shows Navbar only if authenticated, Footer always visible, "Go to Login" link when not authenticated):

Content sections (use same styling as HowItWorksPage -- section headers as h2 text-xl font-semibold, body as text-sm text-slate-400 leading-relaxed):

- **What data we collect**: Google account email and name (for authentication), CardTrader API token (stored encrypted, used only to fetch wishlists and prices), price snapshots of monitored cards, Telegram chat ID (if notifications enabled).
- **How we use your data**: Solely to provide the monitoring service -- importing wishlists, tracking prices, sending alerts. We do not sell, share, or use your data for advertising.
- **Data storage**: All data is stored in Supabase (hosted in EU). Row-level security ensures users can only access their own data.
- **Third-party services**: Google OAuth (authentication), CardTrader API (card data), Telegram Bot API (notifications), Supabase (database and auth).
- **Data deletion**: You can stop monitoring cards at any time. To delete your account and all associated data, contact the developer.
- **Beta notice**: This service is provided as-is during beta. Data handling practices may evolve. We will notify users of significant changes.

Page title: "Privacy"

2. **Update src/App.tsx**: Add import for PrivacyPage and a new public route `<Route path="/privacy" element={<PrivacyPage />} />` right after the `/how-it-works` route.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Privacy page accessible at /privacy with meaningful content about data handling. Route registered in App.tsx. Page follows existing public page patterns (conditional Navbar, Footer, back-to-login link).</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- `npm run build` completes successfully
- Login page visually shows: BETA badge, catchy description, feature bullets, sign-in card, beta disclaimer, How It Works and Privacy links
- /privacy route loads the Privacy page with all content sections
- /how-it-works link from login page navigates correctly
</verification>

<success_criteria>
- Login page communicates value proposition clearly to first-time visitors
- Beta status is visible with disclaimer about potential discontinuation
- Navigation to How It Works and Privacy pages works from login page
- Privacy page has comprehensive, honest content about data practices
- All existing functionality (sign-in, redirect) unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/10-improve-homepage-with-catchy-description/10-SUMMARY.md`
</output>
