import { describe, it, expect } from 'vitest';
import { evaluateThreshold } from '../src/lib/telegram-utils';
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

describe('evaluateThreshold', () => {
  it('triggers when price drops below threshold (20% drop >= 15% threshold, direction=down)', () => {
    const result = evaluateThreshold(makeRule(), 1000, 800);
    expect(result.triggered).toBe(true);
    expect(result.percentChange).toBe(-20);
  });

  it('does not trigger when drop is below threshold (20% drop < 25% threshold)', () => {
    const result = evaluateThreshold(makeRule({ threshold_percent: 25 }), 1000, 800);
    expect(result.triggered).toBe(false);
    expect(result.percentChange).toBe(-20);
  });

  it('does not trigger for price rise when direction is down-only', () => {
    const result = evaluateThreshold(makeRule({ direction: 'down' }), 1000, 1200);
    expect(result.triggered).toBe(false);
    expect(result.percentChange).toBe(20);
  });

  it('triggers for price rise when direction is up', () => {
    const result = evaluateThreshold(makeRule({ direction: 'up', threshold_percent: 15 }), 1000, 1200);
    expect(result.triggered).toBe(true);
    expect(result.percentChange).toBe(20);
  });

  it('triggers for price drop when direction is both', () => {
    const result = evaluateThreshold(makeRule({ direction: 'both' }), 1000, 800);
    expect(result.triggered).toBe(true);
    expect(result.percentChange).toBe(-20);
  });

  it('treats null baseline as infinity -- any price is a drop (triggered)', () => {
    const result = evaluateThreshold(makeRule({ direction: 'down' }), null, 500);
    expect(result.triggered).toBe(true);
    expect(result.percentChange).toBe(-100);
  });

  it('null baseline with direction=up does not trigger (drop, not rise)', () => {
    const result = evaluateThreshold(makeRule({ direction: 'up' }), null, 500);
    expect(result.triggered).toBe(false);
    expect(result.percentChange).toBe(-100);
  });

  it('returns not triggered when current price is null (no offers)', () => {
    const result = evaluateThreshold(makeRule(), 1000, null);
    expect(result.triggered).toBe(false);
    expect(result.percentChange).toBe(0);
  });

  it('skips disabled rules', () => {
    const result = evaluateThreshold(makeRule({ enabled: false }), 1000, 500);
    expect(result.triggered).toBe(false);
    expect(result.percentChange).toBe(0);
  });
});
