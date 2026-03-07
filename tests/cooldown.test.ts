import { describe, it, expect } from 'vitest';
import { shouldNotify } from '../src/lib/telegram-utils';
import type { ThresholdRule } from '../src/lib/cardtrader-types';

function makeRule(overrides: Partial<ThresholdRule> = {}): ThresholdRule {
  return {
    type: 'threshold',
    threshold_percent: 15,
    direction: 'down',
    enabled: true,
    ...overrides,
  };
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

describe('shouldNotify', () => {
  it('evaluates against baseline when no previous notification', () => {
    const result = shouldNotify(makeRule(), 1000, 800, null);
    expect(result.triggered).toBe(true);
    expect(result.percentChange).toBe(-20);
    expect(result.comparisonPriceCents).toBe(1000);
  });

  it('uses last notified price as baseline during 24h cooldown', () => {
    const result = shouldNotify(makeRule(), 1000, 700, {
      priceCents: 900,
      sentAt: hoursAgo(23),
    });
    // Compare against 900 (last notified), not 1000 (original baseline)
    // (700 - 900) / 900 = -22.2%, >= 15% threshold -> triggered
    expect(result.triggered).toBe(true);
    expect(result.comparisonPriceCents).toBe(900);
    expect(result.percentChange).toBeCloseTo(-22.22, 1);
  });

  it('uses original baseline when cooldown expired (>24h)', () => {
    const result = shouldNotify(makeRule(), 1000, 800, {
      priceCents: 900,
      sentAt: hoursAgo(25),
    });
    // Cooldown expired, compare against original baseline (1000)
    expect(result.triggered).toBe(true);
    expect(result.comparisonPriceCents).toBe(1000);
    expect(result.percentChange).toBe(-20);
  });

  it('bypasses cooldown when price moved enough from last alert price', () => {
    const result = shouldNotify(makeRule({ threshold_percent: 10 }), 1000, 750, {
      priceCents: 900,
      sentAt: hoursAgo(12),
    });
    // Within cooldown, compare against 900: (750-900)/900 = -16.7%, >= 10% -> triggered
    expect(result.triggered).toBe(true);
    expect(result.comparisonPriceCents).toBe(900);
  });

  it('does not trigger during cooldown when price has not moved enough', () => {
    const result = shouldNotify(makeRule({ threshold_percent: 15 }), 1000, 880, {
      priceCents: 900,
      sentAt: hoursAgo(12),
    });
    // Within cooldown, compare against 900: (880-900)/900 = -2.2%, < 15% -> not triggered
    expect(result.triggered).toBe(false);
    expect(result.comparisonPriceCents).toBe(900);
  });
});
