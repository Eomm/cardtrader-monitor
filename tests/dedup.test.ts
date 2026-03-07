import { describe, expect, it } from 'vitest';
import { deduplicateBlueprintIds } from '../src/lib/cardtrader-utils';

describe('deduplicateBlueprintIds', () => {
  it('returns unique blueprint IDs', () => {
    const cards = [
      { blueprint_id: 1 },
      { blueprint_id: 2 },
      { blueprint_id: 1 },
      { blueprint_id: 3 },
      { blueprint_id: 2 },
    ];
    const result = deduplicateBlueprintIds(cards);
    expect(result).toHaveLength(3);
    expect(result).toContain(1);
    expect(result).toContain(2);
    expect(result).toContain(3);
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateBlueprintIds([])).toEqual([]);
  });

  it('returns single element for single input', () => {
    expect(deduplicateBlueprintIds([{ blueprint_id: 42 }])).toEqual([42]);
  });
});
