import { useState } from 'react';
import type { FixedPriceRule, NotificationRule, ThresholdRule } from '../lib/cardtrader-types';

type PriceChartProps = {
  priceHistory: { price_cents: number; recorded_at: string }[];
  baselinePriceCents: number | null;
  rules: NotificationRule[] | null;
};

const PAD_LEFT = 55;
const PAD_RIGHT = 15;
const PAD_TOP = 15;
const PAD_BOTTOM = 30;
const WIDTH = 400;
const HEIGHT = 200;
const CHART_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

function toX(index: number, total: number): number {
  if (total <= 1) return PAD_LEFT;
  return PAD_LEFT + (index / (total - 1)) * CHART_W;
}

function toY(cents: number, minCents: number, maxCents: number): number {
  if (maxCents === minCents) return PAD_TOP + CHART_H / 2;
  return PAD_TOP + CHART_H - ((cents - minCents) / (maxCents - minCents)) * CHART_H;
}

function formatLabel(cents: number): string {
  return `EUR ${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Y-axis tick values for the chart
const Y_TICK_INDICES = [0, 1, 2, 3] as const;

export function PriceChart({ priceHistory, baselinePriceCents, rules }: PriceChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Need at least 2 points for a line
  if (priceHistory.length < 2) return null;

  // Reverse to oldest-first (chart left=oldest, right=newest)
  const data = [...priceHistory].reverse();

  // Collect all rule line values (in cents) for Y range computation
  const ruleLinesInCents: number[] = [];

  const enabledThresholds = (rules ?? []).filter(
    (r): r is ThresholdRule => r.type === 'threshold' && r.enabled,
  );
  const enabledFixed = (rules ?? []).filter(
    (r): r is FixedPriceRule => r.type === 'fixed_price' && r.enabled,
  );

  if (baselinePriceCents !== null) {
    for (const rule of enabledThresholds) {
      const { threshold_percent: pct, direction } = rule;
      if (direction === 'down' || direction === 'both') {
        ruleLinesInCents.push(baselinePriceCents * (1 - pct / 100));
      }
      if (direction === 'up' || direction === 'both') {
        ruleLinesInCents.push(baselinePriceCents * (1 + pct / 100));
      }
    }
  }

  for (const rule of enabledFixed) {
    ruleLinesInCents.push(rule.price_eur * 100);
  }

  // Y range from data + rules + baseline, with 10% padding
  const allValues = [
    ...data.map((d) => d.price_cents),
    ...ruleLinesInCents,
    ...(baselinePriceCents !== null ? [baselinePriceCents] : []),
  ];

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = rawMax - rawMin || rawMax * 0.1 || 1;
  const minCents = rawMin - range * 0.1;
  const maxCents = rawMax + range * 0.1;

  // Build polyline points
  const points = data
    .map((d, i) => `${toX(i, data.length)},${toY(d.price_cents, minCents, maxCents)}`)
    .join(' ');

  // Filled area path: go along the line then close at bottom
  const firstX = toX(0, data.length);
  const lastX = toX(data.length - 1, data.length);
  const bottomY = PAD_TOP + CHART_H;
  const areaPoints = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

  // Y-axis ticks: 4 evenly spaced values
  const yTicks = Y_TICK_INDICES.map((i) => minCents + ((maxCents - minCents) * i) / 3);

  // Text labels
  const firstDate = formatDate(data[0].recorded_at);
  const lastDate = formatDate(data[data.length - 1].recorded_at);

  return (
    <div className="max-w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ fontFamily: 'sans-serif' }}
        aria-hidden="true"
      >
        {/* Y-axis tick labels */}
        {yTicks.map((val, i) => {
          const y = toY(val, minCents, maxCents);
          const label = formatLabel(val);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: static tick positions that never reorder
            <text key={i} x={PAD_LEFT - 4} y={y + 3} textAnchor="end" fill="#64748b" fontSize={10}>
              {label}
            </text>
          );
        })}

        {/* X-axis labels: first and last */}
        <text
          x={toX(0, data.length)}
          y={PAD_TOP + CHART_H + 18}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10}
        >
          {firstDate}
        </text>
        <text
          x={toX(data.length - 1, data.length)}
          y={PAD_TOP + CHART_H + 18}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10}
        >
          {lastDate}
        </text>

        {/* Filled area under price line */}
        <polygon points={areaPoints} fill="#3b82f6" fillOpacity={0.1} stroke="none" />

        {/* Price polyline */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data point circles with hit targets */}
        {data.map((d, i) => {
          const cx = toX(i, data.length);
          const cy = toY(d.price_cents, minCents, maxCents);
          const isHovered = hovered === i;
          return (
            <g key={d.recorded_at}>
              {/* Visible circle */}
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 4 : 3}
                fill="#3b82f6"
                style={{ pointerEvents: 'none' }}
              />
              {/* Invisible hit target */}
              <circle
                cx={cx}
                cy={cy}
                r={8}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'crosshair' }}
              />
            </g>
          );
        })}

        {/* Baseline line */}
        {baselinePriceCents !== null &&
          baselinePriceCents >= minCents &&
          baselinePriceCents <= maxCents && (
            <g>
              <line
                x1={PAD_LEFT}
                y1={toY(baselinePriceCents, minCents, maxCents)}
                x2={WIDTH - PAD_RIGHT}
                y2={toY(baselinePriceCents, minCents, maxCents)}
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="6 4"
              />
              <text
                x={WIDTH - PAD_RIGHT - 2}
                y={toY(baselinePriceCents, minCents, maxCents) - 3}
                textAnchor="end"
                fill="#64748b"
                fontSize={9}
              >
                Baseline
              </text>
            </g>
          )}

        {/* Threshold rule lines */}
        {baselinePriceCents !== null &&
          enabledThresholds.map((rule, rIdx) => {
            const lines: { value: number; label: string }[] = [];
            const pct = rule.threshold_percent;
            if (rule.direction === 'down' || rule.direction === 'both') {
              lines.push({
                value: baselinePriceCents * (1 - pct / 100),
                label: `-${pct}%`,
              });
            }
            if (rule.direction === 'up' || rule.direction === 'both') {
              lines.push({
                value: baselinePriceCents * (1 + pct / 100),
                label: `+${pct}%`,
              });
            }
            return lines.map(({ value, label }, lIdx) => {
              if (value < minCents || value > maxCents) return null;
              const y = toY(value, minCents, maxCents);
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: rule+direction pairs are positionally stable
                <g key={`threshold-${rIdx}-${lIdx}`}>
                  <line
                    x1={PAD_LEFT}
                    y1={y}
                    x2={WIDTH - PAD_RIGHT}
                    y2={y}
                    stroke="#f59e0b"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={WIDTH - PAD_RIGHT - 2}
                    y={y - 3}
                    textAnchor="end"
                    fill="#f59e0b"
                    fontSize={9}
                  >
                    {label}
                  </text>
                </g>
              );
            });
          })}

        {/* Fixed price rule lines */}
        {enabledFixed.map((rule, rIdx) => {
          const value = rule.price_eur * 100;
          if (value < minCents || value > maxCents) return null;
          const y = toY(value, minCents, maxCents);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: rule position is stable for fixed-price rules
            <g key={`fixed-${rIdx}`}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={WIDTH - PAD_RIGHT}
                y2={y}
                stroke="#a855f7"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={WIDTH - PAD_RIGHT - 2}
                y={y - 3}
                textAnchor="end"
                fill="#a855f7"
                fontSize={9}
              >
                {formatLabel(value)}
              </text>
            </g>
          );
        })}
        {/* Hover tooltip — rendered last to appear on top */}
        {hovered !== null &&
          (() => {
            const d = data[hovered];
            const cx = toX(hovered, data.length);
            const cy = toY(d.price_cents, minCents, maxCents);

            const priceLine = formatLabel(d.price_cents);
            const dateObj = new Date(d.recorded_at);
            const datePart = dateObj.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            const timePart = dateObj.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });
            const timeLine = `${datePart}, ${timePart}`;

            const tooltipW = 90;
            const tooltipH = 34;

            // Position: above by default, below if near top edge
            const positionBelow = cy < PAD_TOP + 40;
            const ty = positionBelow ? cy + 15 : cy - tooltipH - 5;

            // Horizontal anchor: right-align if near right edge
            const nearRight = cx > WIDTH - 80;
            const tx = nearRight ? cx - tooltipW : cx;

            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={tx}
                  y={ty}
                  width={tooltipW}
                  height={tooltipH}
                  fill="#1e293b"
                  rx={4}
                  stroke="#334155"
                  strokeWidth={1}
                />
                <text
                  x={tx + tooltipW / 2}
                  y={ty + 13}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize={10}
                >
                  {priceLine}
                </text>
                <text
                  x={tx + tooltipW / 2}
                  y={ty + 26}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={9}
                >
                  {timeLine}
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
  );
}
