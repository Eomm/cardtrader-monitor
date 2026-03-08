import type { ThresholdRule } from './cardtrader-types';

// ── Types ──────────────────────────────────────────────────────────

export interface ThresholdAlert {
  cardName: string;
  blueprintId: number;
  oldPriceCents: number;
  newPriceCents: number;
  percentChange: number;
}

export interface ThresholdResult {
  triggered: boolean;
  percentChange: number;
}

export interface NotifyResult {
  triggered: boolean;
  percentChange: number;
  comparisonPriceCents: number | null;
}

// ── Threshold Evaluation ───────────────────────────────────────────

export function evaluateThreshold(
  rule: ThresholdRule,
  baselineCents: number | null,
  currentCents: number | null,
): ThresholdResult {
  if (!rule.enabled) {
    return { triggered: false, percentChange: 0 };
  }

  if (currentCents === null) {
    return { triggered: false, percentChange: 0 };
  }

  if (baselineCents === null) {
    // Null baseline = infinity; any actual price is a drop
    const percentChange = -100;
    const directionMatch = rule.direction === 'down' || rule.direction === 'both';
    return {
      triggered: directionMatch,
      percentChange,
    };
  }

  const percentChange = ((currentCents - baselineCents) / baselineCents) * 100;

  const meetsThreshold = Math.abs(percentChange) >= rule.threshold_percent;

  let directionMatch = false;
  if (rule.direction === 'both') {
    directionMatch = true;
  } else if (rule.direction === 'down') {
    directionMatch = percentChange < 0;
  } else if (rule.direction === 'up') {
    directionMatch = percentChange > 0;
  }

  return {
    triggered: meetsThreshold && directionMatch,
    percentChange,
  };
}

// ── Cooldown Logic ─────────────────────────────────────────────────

const COOLDOWN_HOURS = 24;

export function shouldNotify(
  rule: ThresholdRule,
  baselineCents: number | null,
  currentCents: number | null,
  lastNotification: { priceCents: number; sentAt: Date } | null,
): NotifyResult {
  // No previous notification or cooldown expired: evaluate against original baseline
  if (!lastNotification) {
    const result = evaluateThreshold(rule, baselineCents, currentCents);
    return {
      ...result,
      comparisonPriceCents: baselineCents,
    };
  }

  const hoursSinceLast = (Date.now() - lastNotification.sentAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLast >= COOLDOWN_HOURS) {
    // Cooldown expired: use original baseline
    const result = evaluateThreshold(rule, baselineCents, currentCents);
    return {
      ...result,
      comparisonPriceCents: baselineCents,
    };
  }

  // Within cooldown: compare against last notified price
  const result = evaluateThreshold(rule, lastNotification.priceCents, currentCents);
  return {
    ...result,
    comparisonPriceCents: lastNotification.priceCents,
  };
}

// ── MarkdownV2 Escaping ────────────────────────────────────────────

const MARKDOWN_V2_SPECIAL = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

export function escapeMarkdownV2(text: string): string {
  return text.replace(MARKDOWN_V2_SPECIAL, '\\$1');
}

export function escapeMarkdownV2Url(url: string): string {
  return url.replace(/([)\\])/g, '\\$1');
}

// ── Formatting ─────────────────────────────────────────────────────

export function formatEurCents(cents: number): string {
  return `\u20AC${(cents / 100).toFixed(2)}`;
}

export function formatAlertMessage(alerts: ThresholdAlert[]): string {
  return alerts
    .map((alert) => {
      const emoji = alert.percentChange < 0 ? '\u{1F7E2}' : '\u{1F534}';
      const name = escapeMarkdownV2(alert.cardName);
      const url = escapeMarkdownV2Url(`https://www.cardtrader.com/en/cards/${alert.blueprintId}`);
      const oldPrice = escapeMarkdownV2(formatEurCents(alert.oldPriceCents));
      const newPrice = escapeMarkdownV2(formatEurCents(alert.newPriceCents));
      const pct = escapeMarkdownV2(`(${Math.abs(alert.percentChange).toFixed(1)}%)`);
      return `${emoji} [${name}](${url}) ${oldPrice} \\-\\> ${newPrice} ${pct}`;
    })
    .join('\n');
}
