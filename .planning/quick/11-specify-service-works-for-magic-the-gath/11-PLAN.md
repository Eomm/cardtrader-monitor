---
phase: quick-11
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/LoginPage.tsx
  - src/pages/PrivacyPage.tsx
autonomous: true
requirements: [QUICK-11]
must_haves:
  truths:
    - "Homepage clearly states the service is for Magic: The Gathering cards"
    - "Privacy page mentions Magic: The Gathering in its service description"
  artifacts:
    - path: "src/pages/LoginPage.tsx"
      provides: "Updated hero copy with MTG mention"
      contains: "Magic: The Gathering"
    - path: "src/pages/PrivacyPage.tsx"
      provides: "Updated service description with MTG mention"
      contains: "Magic: The Gathering"
  key_links: []
---

<objective>
Add "Magic: The Gathering" mentions to the LoginPage and PrivacyPage so visitors immediately understand the service currently supports MTG cards only.

Purpose: Users landing on the homepage or reading the privacy page should know this is an MTG-specific price monitoring tool, not a generic card trading service.
Output: Updated copy in LoginPage.tsx and PrivacyPage.tsx
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/LoginPage.tsx
@src/pages/PrivacyPage.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Magic: The Gathering mentions to LoginPage and PrivacyPage</name>
  <files>src/pages/LoginPage.tsx, src/pages/PrivacyPage.tsx</files>
  <action>
Update the text copy in both pages to mention Magic: The Gathering:

**LoginPage.tsx:**
- Line 48 (hero subtitle): Change to mention MTG cards specifically. Example: "Stop refreshing CardTrader. Get notified when prices drop on the Magic: The Gathering cards you care about."
- Line 51 (first checklist item): Change "Import your wishlists" to "Import your MTG wishlists" or similar
- Line 79 (sign-in helper text): Change to "Sign in to import your CardTrader MTG wishlists and set up price alerts."

**PrivacyPage.tsx:**
- Line 57-59 (How we use your data, first paragraph): Update the service description to mention MTG. Example: "Your data is used solely to provide the CardTrader Monitor service — importing Magic: The Gathering wishlists, tracking card prices, and sending alerts when price conditions are met."

Keep changes minimal and natural-sounding. Do not add new sections or restructure the pages. Just weave "Magic: The Gathering" or "MTG" into existing copy where it reads naturally.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && grep -c "Magic: The Gathering\|MTG" src/pages/LoginPage.tsx src/pages/PrivacyPage.tsx</automated>
  </verify>
  <done>LoginPage has at least 2 MTG mentions in the hero/checklist area. PrivacyPage has at least 1 MTG mention in service description. All text reads naturally.</done>
</task>

</tasks>

<verification>
- `grep "Magic: The Gathering\|MTG" src/pages/LoginPage.tsx` shows mentions in hero copy
- `grep "Magic: The Gathering\|MTG" src/pages/PrivacyPage.tsx` shows mention in service description
- `npx tsc --noEmit` passes (no type errors introduced)
- App builds: `npm run build` succeeds
</verification>

<success_criteria>
- Homepage hero text clearly communicates the service monitors Magic: The Gathering card prices
- Privacy page service description mentions Magic: The Gathering
- No layout or styling changes, just text updates
- Build passes without errors
</success_criteria>

<output>
After completion, create `.planning/quick/11-specify-service-works-for-magic-the-gath/11-SUMMARY.md`
</output>
