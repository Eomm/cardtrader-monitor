// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, FILTER_KEY, loadFilters } from '../src/components/CardList';

describe('loadFilters', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when localStorage key is missing', () => {
    expect(loadFilters()).toEqual(DEFAULT_FILTERS);
  });

  it('returns defaults when localStorage contains invalid JSON', () => {
    localStorage.setItem(FILTER_KEY, 'not-json');
    expect(loadFilters()).toEqual(DEFAULT_FILTERS);
  });

  it('round-trips serialized filters correctly', () => {
    const filters = { search: 'pikachu', expansionFilter: 'Base Set', wishlistFilter: 'wl-123' };
    localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
    expect(loadFilters()).toEqual(filters);
  });

  it('merges partial stored objects with defaults', () => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ search: 'test' }));
    expect(loadFilters()).toEqual({ search: 'test', expansionFilter: '', wishlistFilter: '' });
  });
});
