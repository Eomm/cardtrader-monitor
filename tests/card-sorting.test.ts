import { describe, expect, it } from 'vitest';
import { sortCards } from '../src/lib/cardtrader-utils';
import type { MonitoredCardWithPrice } from '../src/lib/cardtrader-types';

function makeCard(overrides: Partial<MonitoredCardWithPrice>): MonitoredCardWithPrice {
  return {
    id: 'test-id',
    blueprint_id: 1,
    card_name: 'Test Card',
    expansion_name: 'Test Set',
    game_id: 1,
    collector_number: '001',
    image_url: null,
    baseline_price_cents: null,
    notification_rule: null,
    is_active: true,
    created_at: '2026-01-01',
    latest_price_cents: null,
    language_required: 'en',
    condition_required: null,
    foil_required: null,
    only_zero: true,
    wishlist_id: 'wl-1',
    ...overrides,
  };
}

describe('sortCards', () => {
  it('puts active cards before inactive cards', () => {
    const cards = [
      makeCard({ id: 'inactive', is_active: false, latest_price_cents: 100 }),
      makeCard({ id: 'active', is_active: true, latest_price_cents: 200 }),
    ];
    const sorted = sortCards(cards);
    expect(sorted[0].id).toBe('active');
    expect(sorted[1].id).toBe('inactive');
  });

  it('sorts active cards by price ascending', () => {
    const cards = [
      makeCard({ id: 'expensive', latest_price_cents: 500 }),
      makeCard({ id: 'cheap', latest_price_cents: 100 }),
      makeCard({ id: 'mid', latest_price_cents: 300 }),
    ];
    const sorted = sortCards(cards);
    expect(sorted.map((c) => c.id)).toEqual(['cheap', 'mid', 'expensive']);
  });

  it('puts active cards with null prices at end of active group', () => {
    const cards = [
      makeCard({ id: 'no-price', latest_price_cents: null }),
      makeCard({ id: 'has-price', latest_price_cents: 100 }),
    ];
    const sorted = sortCards(cards);
    expect(sorted[0].id).toBe('has-price');
    expect(sorted[1].id).toBe('no-price');
  });

  it('sorts inactive cards by price ascending among themselves', () => {
    const cards = [
      makeCard({ id: 'inactive-exp', is_active: false, latest_price_cents: 500 }),
      makeCard({ id: 'inactive-cheap', is_active: false, latest_price_cents: 100 }),
    ];
    const sorted = sortCards(cards);
    expect(sorted.map((c) => c.id)).toEqual(['inactive-cheap', 'inactive-exp']);
  });

  it('handles empty array', () => {
    expect(sortCards([])).toEqual([]);
  });

  it('complete ordering: active-priced, active-null, inactive-priced, inactive-null', () => {
    const cards = [
      makeCard({ id: 'inactive-null', is_active: false, latest_price_cents: null }),
      makeCard({ id: 'active-null', is_active: true, latest_price_cents: null }),
      makeCard({ id: 'inactive-100', is_active: false, latest_price_cents: 100 }),
      makeCard({ id: 'active-200', is_active: true, latest_price_cents: 200 }),
      makeCard({ id: 'active-50', is_active: true, latest_price_cents: 50 }),
    ];
    const sorted = sortCards(cards);
    expect(sorted.map((c) => c.id)).toEqual([
      'active-50',
      'active-200',
      'active-null',
      'inactive-100',
      'inactive-null',
    ]);
  });
});
