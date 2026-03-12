import { describe, expect, it } from 'vitest';
import type { FixedPriceRule } from '../src/lib/cardtrader-types';
import { shouldNotifyFixedPrice } from '../src/lib/telegram-utils';

describe('shouldNotifyFixedPrice — direction=down', () => {
  const rule: FixedPriceRule = {
    type: 'fixed_price',
    price_eur: 3.5,
    direction: 'down',
    enabled: true,
  };
  // targetCents = 350

  it('triggers when current price crosses below target (no previous price)', () => {
    const result = shouldNotifyFixedPrice(rule, null, 300);
    expect(result.triggered).toBe(true);
  });

  it('triggers when current price equals target exactly (no previous price)', () => {
    const result = shouldNotifyFixedPrice(rule, null, 350);
    expect(result.triggered).toBe(true);
  });

  it('triggers when previous was above target and current is below', () => {
    const result = shouldNotifyFixedPrice(rule, 400, 300);
    expect(result.triggered).toBe(true);
  });

  it('triggers when previous was above target and current is at target', () => {
    const result = shouldNotifyFixedPrice(rule, 400, 350);
    expect(result.triggered).toBe(true);
  });

  it('does NOT trigger when current price is above target', () => {
    const result = shouldNotifyFixedPrice(rule, 300, 400);
    expect(result.triggered).toBe(false);
  });

  it('does NOT trigger when already below target (no crossing — previous also below)', () => {
    const result = shouldNotifyFixedPrice(rule, 320, 310);
    expect(result.triggered).toBe(false);
  });

  it('does NOT trigger when current price equals target and previous also below (no crossing)', () => {
    const result = shouldNotifyFixedPrice(rule, 340, 350);
    expect(result.triggered).toBe(false);
  });

  it('does NOT trigger when current is null', () => {
    const result = shouldNotifyFixedPrice(rule, 400, null);
    expect(result.triggered).toBe(false);
  });
});

describe('shouldNotifyFixedPrice — direction=up', () => {
  const rule: FixedPriceRule = {
    type: 'fixed_price',
    price_eur: 3.5,
    direction: 'up',
    enabled: true,
  };
  // targetCents = 350

  it('triggers when previous was below target and current is above', () => {
    const result = shouldNotifyFixedPrice(rule, 300, 400);
    expect(result.triggered).toBe(true);
  });

  it('triggers when previous was below target and current equals target', () => {
    const result = shouldNotifyFixedPrice(rule, 300, 350);
    expect(result.triggered).toBe(true);
  });

  it('does NOT trigger when current is below target', () => {
    const result = shouldNotifyFixedPrice(rule, 400, 300);
    expect(result.triggered).toBe(false);
  });

  it('does NOT trigger when already above target (no crossing)', () => {
    const result = shouldNotifyFixedPrice(rule, 360, 400);
    expect(result.triggered).toBe(false);
  });

  it('does NOT trigger when current is null', () => {
    const result = shouldNotifyFixedPrice(rule, 300, null);
    expect(result.triggered).toBe(false);
  });
});

describe('shouldNotifyFixedPrice — direction=both', () => {
  const rule: FixedPriceRule = {
    type: 'fixed_price',
    price_eur: 3.5,
    direction: 'both',
    enabled: true,
  };
  // targetCents = 350

  it('triggers on downward crossing', () => {
    const result = shouldNotifyFixedPrice(rule, 400, 300);
    expect(result.triggered).toBe(true);
  });

  it('triggers on upward crossing', () => {
    const result = shouldNotifyFixedPrice(rule, 300, 400);
    expect(result.triggered).toBe(true);
  });

  it('does NOT trigger when already on same side', () => {
    const result = shouldNotifyFixedPrice(rule, 360, 400);
    expect(result.triggered).toBe(false);
  });
});

describe('shouldNotifyFixedPrice — disabled rule', () => {
  const rule: FixedPriceRule = {
    type: 'fixed_price',
    price_eur: 3.5,
    direction: 'down',
    enabled: false,
  };

  it('never triggers when disabled', () => {
    const result = shouldNotifyFixedPrice(rule, 400, 300);
    expect(result.triggered).toBe(false);
  });

  it('never triggers when disabled even at exact target', () => {
    const result = shouldNotifyFixedPrice(rule, 400, 350);
    expect(result.triggered).toBe(false);
  });
});

describe('shouldNotifyFixedPrice — result shape', () => {
  const rule: FixedPriceRule = {
    type: 'fixed_price',
    price_eur: 3.5,
    direction: 'down',
    enabled: true,
  };

  it('returns percentChange and comparisonPriceCents when triggered', () => {
    const result = shouldNotifyFixedPrice(rule, 400, 300);
    expect(result.triggered).toBe(true);
    expect(typeof result.percentChange).toBe('number');
    expect(result.comparisonPriceCents).toBe(400);
  });

  it('returns comparisonPriceCents=null when no previous price', () => {
    const result = shouldNotifyFixedPrice(rule, null, 300);
    expect(result.triggered).toBe(true);
    expect(result.comparisonPriceCents).toBeNull();
  });
});
