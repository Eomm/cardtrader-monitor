import { describe, expect, it } from 'vitest';
import {
  createDefaultNotificationRule,
  createDefaultNotificationRules,
  createDefaultStabilityRule,
} from '../src/lib/cardtrader-utils';

describe('createDefaultNotificationRule', () => {
  it('returns correct default notification rule shape', () => {
    const rule = createDefaultNotificationRule();
    expect(rule).toEqual({
      type: 'threshold',
      threshold_percent: 20,
      direction: 'both',
      enabled: true,
    });
  });

  it('returns a new object each time', () => {
    const rule1 = createDefaultNotificationRule();
    const rule2 = createDefaultNotificationRule();
    expect(rule1).not.toBe(rule2);
    expect(rule1).toEqual(rule2);
  });
});

describe('createDefaultStabilityRule', () => {
  it('returns correct default stability rule shape', () => {
    const rule = createDefaultStabilityRule();
    expect(rule).toEqual({
      type: 'stability',
      range_percent: 5,
      consecutive_days: 3,
      enabled: true,
    });
  });

  it('returns a new object each time', () => {
    const rule1 = createDefaultStabilityRule();
    const rule2 = createDefaultStabilityRule();
    expect(rule1).not.toBe(rule2);
    expect(rule1).toEqual(rule2);
  });
});

describe('createDefaultNotificationRules', () => {
  it('returns an array with one default threshold rule', () => {
    const rules = createDefaultNotificationRules();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({
      type: 'threshold',
      threshold_percent: 20,
      direction: 'both',
      enabled: true,
    });
  });

  it('returns a new array each time', () => {
    const rules1 = createDefaultNotificationRules();
    const rules2 = createDefaultNotificationRules();
    expect(rules1).not.toBe(rules2);
    expect(rules1).toEqual(rules2);
  });
});
