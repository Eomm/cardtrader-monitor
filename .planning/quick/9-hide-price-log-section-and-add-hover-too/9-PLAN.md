---
phase: quick-9
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/CardDetailPage.tsx
  - src/components/PriceChart.tsx
autonomous: true
requirements: [QUICK-9]
must_haves:
  truths:
    - "Price Log section is not visible on card detail page"
    - "Hovering a data point on PriceChart shows price and timestamp"
  artifacts:
    - path: "src/pages/CardDetailPage.tsx"
      provides: "Card detail page without Price Log section"
    - path: "src/components/PriceChart.tsx"
      provides: "Interactive chart with hover tooltips on data points"
---

<objective>
Hide the Price Log section from the card detail page (redundant now that PriceChart exists) and add hover tooltips to PriceChart data points showing price and timestamp.

Purpose: The Price Log was useful before the chart existed; now it clutters the page. Hover tooltips make the chart interactive and provide the same per-point detail.
Output: Updated CardDetailPage.tsx and PriceChart.tsx
</objective>

<context>
@src/pages/CardDetailPage.tsx
@src/components/PriceChart.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove Price Log section and add chart hover tooltips</name>
  <files>src/pages/CardDetailPage.tsx, src/components/PriceChart.tsx</files>
  <action>
**CardDetailPage.tsx:**
Delete the entire Price Log block (lines 284-312) -- the second `{priceHistory.length > 1 && (...)}` block that renders the "Price Log" heading and the list of date+price entries.

**PriceChart.tsx:**
Add interactive hover tooltips to data point circles using React state:

1. Add `useState` import and state for hovered point: `const [hovered, setHovered] = useState<number | null>(null)` (index into `data` array).

2. Replace the existing `<circle>` elements with larger invisible hit-target circles (r=8, fill="transparent") that have `onMouseEnter={() => setHovered(i)}` and `onMouseLeave={() => setHovered(null)}` handlers, plus the visible circle (r=3, or r=4 when hovered).

3. When `hovered !== null`, render a tooltip `<g>` positioned near the hovered point:
   - Background: `<rect>` with fill="#1e293b" (slate-800), rx=4, stroke="#334155" (slate-700), strokeWidth=1
   - Text line 1: formatted price using `formatLabel(data[hovered].price_cents)` in fill="#e2e8f0" (slate-200), fontSize=10
   - Text line 2: date+time formatted as "Mar 14, 14:30" in fill="#94a3b8" (slate-400), fontSize=9
   - Position tooltip above the point (y - 35). If point is near top edge (y < PAD_TOP + 40), position below instead (y + 15).
   - If point is near right edge (x > WIDTH - 80), anchor text to the right side. Otherwise left-anchor.

4. Format the date for tooltip using: `new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })` + `new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })`.

5. Ensure the tooltip `<g>` renders LAST in the SVG (on top of everything).

Do NOT add any external tooltip library -- pure SVG + React state.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Price Log section removed from CardDetailPage. Hovering any data point on PriceChart shows a tooltip with formatted price and timestamp. Tooltip repositions to avoid clipping at edges.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Card detail page no longer shows "Price Log" heading or price list
- Hovering chart data points shows tooltip with price and time
</verification>

<success_criteria>
- Price Log section fully removed from CardDetailPage.tsx
- PriceChart shows interactive tooltips on hover with price (EUR X.XX) and timestamp
- No TypeScript or lint errors
</success_criteria>

<output>
After completion, create `.planning/quick/9-hide-price-log-section-and-add-hover-too/9-SUMMARY.md`
</output>
