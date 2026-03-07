import { describe, expect, it } from 'vitest';
import { createDefaultNotificationRule } from '../src/lib/cardtrader-utils';

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
