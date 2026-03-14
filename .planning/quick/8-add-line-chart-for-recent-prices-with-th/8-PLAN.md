---
phase: quick-8
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/PriceChart.tsx
  - src/pages/CardDetailPage.tsx
autonomous: true
requirements: [QUICK-8]
must_haves:
  truths:
    - "Card detail page shows a line chart of recent prices"
    - "Threshold rule lines appear as dashed horizontal lines computed from baseline"
    - "Fixed price rule lines appear as dashed horizontal lines at their EUR value"
    - "Chart gracefully handles 0-1 data points (no chart shown)"
  artifacts:
    - path: "src/components/PriceChart.tsx"
      provides: "SVG line chart component for price history with rule overlay lines"
      min_lines: 80
    - path: "src/pages/CardDetailPage.tsx"
      provides: "Card detail page with chart integrated into Price section"
  key_links:
    - from: "src/pages/CardDetailPage.tsx"
      to: "src/components/PriceChart.tsx"
      via: "PriceChart component import and render"
      pattern: "<PriceChart"
---

<objective>
Add a pure-SVG line chart to the card detail page showing recent price history, with horizontal dashed lines for threshold rules (computed as % of baseline) and fixed price rules (absolute EUR values).

Purpose: Give users a visual representation of price trends and how current prices relate to their alert thresholds.
Output: PriceChart component rendered in CardDetailPage Price section.
</objective>

<execution_context>
@/Users/mspigolon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mspigolon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/CardDetailPage.tsx
@src/components/PriceDisplay.tsx
@src/lib/cardtrader-types.ts

<interfaces>
From src/lib/cardtrader-types.ts:
```typescript
export interface ThresholdRule {
  type: 'threshold';
  threshold_percent: number;
  direction: 'up' | 'down' | 'both';
  enabled: boolean;
}

export interface FixedPriceRule {
  type: 'fixed_price';
  price_eur: number;
  direction: 'up' | 'down' | 'both';
  enabled: boolean;
}

export type NotificationRule = ThresholdRule | StabilityRule | FixedPriceRule;
```

From src/components/PriceDisplay.tsx:
```typescript
export function formatEur(cents: number): string;
```

CardDetailPage already has:
- `priceHistory` state: `{ price_cents: number; recorded_at: string }[]` (up to 10 items, descending order)
- `card.notification_rule`: `NotificationRule[] | null`
- `card.baseline_price_cents`: `number | null`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create PriceChart SVG component</name>
  <files>src/components/PriceChart.tsx</files>
  <action>
Create a new `PriceChart` component that renders a pure SVG line chart (no external charting library).

Props interface:
```typescript
type PriceChartProps = {
  priceHistory: { price_cents: number; recorded_at: string }[];
  baselinePriceCents: number | null;
  rules: NotificationRule[] | null;
};
```

Implementation details:
- Return `null` if `priceHistory` has fewer than 2 data points (not enough for a line).
- Reverse the priceHistory array (it arrives descending; chart should show left=oldest, right=newest).
- SVG viewBox: 400x200 with padding (left: 55, right: 15, top: 15, bottom: 30) for axis labels.
- Compute Y-axis range from the min/max of all price data points AND all rule lines, adding 10% padding so lines are never clipped.
- **Price line:** Solid polyline, stroke `#3b82f6` (blue-500), strokeWidth 2, filled area below with `#3b82f6` at 10% opacity.
- **Data points:** Small circles (r=3) at each data point, same blue-500 fill.
- **X-axis labels:** Show date (MMM DD) for the first and last data point, text-slate-500, text size 10px.
- **Y-axis labels:** Show 3-4 EUR values evenly spaced along the Y axis (use `formatEur` but shortened, e.g. just the number with EUR prefix), text-slate-500, text size 10px, right-aligned at left edge.
- **Baseline line:** If `baselinePriceCents` is not null and falls within the visible Y range, render a horizontal dashed line (stroke `#64748b` slate-500, strokeDasharray="6 4", strokeWidth 1). Add a small "Baseline" label at the right end.
- **Threshold rule lines:** For each enabled ThresholdRule, compute the target price from baseline: for direction "down" draw a line at `baseline * (1 - threshold_percent/100)`, for "up" at `baseline * (1 + threshold_percent/100)`, for "both" draw both lines. Use stroke `#f59e0b` (amber-500), strokeDasharray="4 3", strokeWidth 1. Skip if baseline is null. Add a small label at the right end showing the % value.
- **Fixed price rule lines:** For each enabled FixedPriceRule, draw a horizontal dashed line at `price_eur * 100` (convert EUR to cents). Use stroke `#a855f7` (purple-500), strokeDasharray="4 3", strokeWidth 1. Add a small label at the right end showing the EUR value.
- All text uses `fill` not `className` for SVG text elements. Use font-family sans-serif.
- The component container should have a `max-w-full` wrapper div so it scales responsively.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>PriceChart.tsx exists, exports PriceChart component, TypeScript compiles without errors. Renders SVG line chart with rule overlay lines.</done>
</task>

<task type="auto">
  <name>Task 2: Integrate PriceChart into CardDetailPage</name>
  <files>src/pages/CardDetailPage.tsx</files>
  <action>
Modify CardDetailPage to render the PriceChart in the Price section:

1. Import `PriceChart` from `../components/PriceChart`.
2. Increase the price snapshot limit from 10 to 30 (line ~54: `.limit(10)` to `.limit(30)`) for a more meaningful chart.
3. In the Price section (after the current/baseline/change row, around line 271 where `priceHistory.length > 1` check is), add the PriceChart component ABOVE the existing text list:
```tsx
{priceHistory.length > 1 && (
  <div className="mt-4 border-t border-slate-700 pt-3">
    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
      Price History
    </h3>
    <PriceChart
      priceHistory={priceHistory}
      baselinePriceCents={card.baseline_price_cents}
      rules={card.notification_rule}
    />
  </div>
)}
```
4. Keep the existing text list of recent prices below the chart but change its heading from "Recent Prices" to "Price Log" and limit display to the 10 most recent entries (slice the array before mapping if priceHistory is longer than 10): `priceHistory.slice(0, 10).map(...)`.
  </action>
  <verify>
    <automated>cd /Users/mspigolon/workspace/_experiments/cardtrader-monitor && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>CardDetailPage renders PriceChart above the price text list. Snapshot limit increased to 30. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes
- `npx biome check src/components/PriceChart.tsx src/pages/CardDetailPage.tsx` passes
- Visual: Navigate to any card detail page -- chart appears if 2+ snapshots exist, rule lines visible if rules are configured
</verification>

<success_criteria>
- Line chart renders in card detail page Price section showing price history over time
- Threshold rule lines computed from baseline appear as amber dashed lines
- Fixed price rule lines appear as purple dashed lines at the EUR value
- Baseline shown as slate dashed line
- Chart handles edge cases: 0-1 data points (hidden), no rules (no rule lines), no baseline (no threshold/baseline lines)
- Existing price text list preserved below chart
</success_criteria>

<output>
After completion, create `.planning/quick/8-add-line-chart-for-recent-prices-with-th/8-SUMMARY.md`
</output>
