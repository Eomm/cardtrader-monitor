import type { NotificationRule, ThresholdRule, FixedPriceRule } from '../lib/cardtrader-types';

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

export function PriceChart({ priceHistory, baselinePriceCents, rules }: PriceChartProps) {
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
  const points = data.map((d, i) => `${toX(i, data.length)},${toY(d.price_cents, minCents, maxCents)}`).join(' ');

  // Filled area path: go along the line then close at bottom
  const firstX = toX(0, data.length);
  const lastX = toX(data.length - 1, data.length);
  const bottomY = PAD_TOP + CHART_H;
  const areaPoints = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

  // Y-axis ticks: 4 evenly spaced values
  const yTicks = [0, 1, 2, 3].map((i) => minCents + ((maxCents - minCents) * i) / 3);

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
          return (
            <text
              key={i}
              x={PAD_LEFT - 4}
              y={y + 3}
              textAnchor="end"
              fill="#64748b"
              fontSize={10}
            >
              {formatLabel(val)}
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

        {/* Data point circles */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={toX(i, data.length)}
            cy={toY(d.price_cents, minCents, maxCents)}
            r={3}
            fill="#3b82f6"
          />
        ))}

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
      </svg>
    </div>
  );
}
