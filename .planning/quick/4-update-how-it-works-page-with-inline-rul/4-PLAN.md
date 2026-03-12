---
phase: quick-4
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/HowItWorksPage.tsx
autonomous: true
requirements: [QUICK-4]
must_haves:
  truths:
    - "How It Works page describes inline rule editing on dashboard card rows"
    - "How It Works page describes the fixed price rule type with crossing semantics"
  artifacts:
    - path: "src/pages/HowItWorksPage.tsx"
      provides: "Updated documentation page"
      contains: "fixed price"
  key_links: []
---

<objective>
Update the How It Works page to document two new features: inline rule editing on dashboard card rows, and the fixed price rule type.

Purpose: Users need accurate documentation reflecting the current feature set.
Output: Updated HowItWorksPage.tsx
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/HowItWorksPage.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update How It Works page with inline editing and fixed price rule docs</name>
  <files>src/pages/HowItWorksPage.tsx</files>
  <action>
Make two updates to HowItWorksPage.tsx:

1. In Section 3 ("How notification rules work"), add a NEW paragraph at the beginning of the section (before the existing threshold rules paragraph) describing inline rule editing:

   "The dashboard shows the first active rule for each card directly in the card row. You can edit the rule inline -- click on it to change the threshold, direction, or target price without opening the card detail page. Changes are saved immediately."

   Use the same styling pattern as existing paragraphs (text-slate-400 with bold highlights in text-slate-100).

2. In the same Section 3, add a NEW paragraph AFTER the existing threshold rules paragraph (the one mentioning "threshold rules that trigger when the price moves by a certain percentage") and BEFORE the stability rules paragraph. This paragraph describes the fixed price rule:

   "You can also set a **fixed price** rule that triggers when the market price crosses a specific EUR target. Choose a direction: **down** to be notified when the price drops below your target, **up** when it rises above, or **both** for either crossing. Unlike threshold rules which are percentage-based relative to the baseline, fixed price rules work with an absolute EUR value -- useful when you know exactly how much you are willing to pay."

   Use "crossing" language to match the codebase semantics (Phase 07-01 decision: triggers only when price crosses target threshold).

Keep all existing content intact. Match existing formatting, spacing, and Tailwind class patterns exactly.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>HowItWorksPage.tsx compiles without errors and contains documentation for both inline rule editing and fixed price rules</done>
</task>

</tasks>

<verification>
- TypeScript compiles: `npx tsc --noEmit`
- Page renders: `npm run dev` and visit /how-it-works
</verification>

<success_criteria>
- How It Works page accurately describes inline rule editing on dashboard card rows
- How It Works page accurately describes the fixed price rule type with crossing semantics
- All existing documentation content preserved unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/4-update-how-it-works-page-with-inline-rul/4-SUMMARY.md`
</output>
