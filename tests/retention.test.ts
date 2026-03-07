import { describe, expect, it } from 'vitest';
import { getRetentionDays } from '../src/lib/cardtrader-utils';

describe('getRetentionDays', () => {
  it('returns 30 when no value provided', () => {
    expect(getRetentionDays()).toBe(30);
  });

  it('returns 30 when null is provided', () => {
    expect(getRetentionDays(null)).toBe(30);
  });

  it('returns 30 when undefined is provided', () => {
    expect(getRetentionDays(undefined)).toBe(30);
  });

  it('returns custom value within valid range', () => {
    expect(getRetentionDays(7)).toBe(7);
    expect(getRetentionDays(90)).toBe(90);
    expect(getRetentionDays(365)).toBe(365);
  });

  it('clamps to minimum of 1 day', () => {
    expect(getRetentionDays(0)).toBe(1);
    expect(getRetentionDays(-5)).toBe(1);
  });

  it('clamps to maximum of 365 days', () => {
    expect(getRetentionDays(999)).toBe(365);
    expect(getRetentionDays(500)).toBe(365);
  });
});
