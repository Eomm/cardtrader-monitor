import { describe, expect, it } from 'vitest';
import type { CardFilters, MarketplaceProduct } from '../src/lib/cardtrader-types';
import { filterCtZeroOffers, findCheapestPrice } from '../src/lib/cardtrader-utils';

function makeProduct(overrides: Partial<MarketplaceProduct> = {}): MarketplaceProduct {
  return {
    id: 1,
    price: { cents: 100, formatted: 'EUR 1.00' },
    quantity: 1,
    properties_hash: {
      condition: 'Near Mint',
      mtg_language: 'en',
      mtg_foil: false,
    },
    user: {
      can_sell_via_hub: true,
      user_type: 'regular',
      can_sell_sealed_with_ct_zero: false,
    },
    ...overrides,
  };
}

const defaultFilters: CardFilters = {
  language: 'en',
  onlyZero: true,
};

describe('filterCtZeroOffers', () => {
  it('includes sellers with can_sell_via_hub=true', () => {
    const products = [makeProduct({ user: { can_sell_via_hub: true, user_type: 'regular', can_sell_sealed_with_ct_zero: false } })];
    expect(filterCtZeroOffers(products, defaultFilters)).toHaveLength(1);
  });

  it('includes sellers with user_type=pro', () => {
    const products = [makeProduct({ user: { can_sell_via_hub: false, user_type: 'pro', can_sell_sealed_with_ct_zero: false } })];
    expect(filterCtZeroOffers(products, defaultFilters)).toHaveLength(1);
  });

  it('includes sellers with can_sell_sealed_with_ct_zero=true', () => {
    const products = [makeProduct({ user: { can_sell_via_hub: false, user_type: 'regular', can_sell_sealed_with_ct_zero: true } })];
    expect(filterCtZeroOffers(products, defaultFilters)).toHaveLength(1);
  });

  it('excludes sellers without any CT Zero qualification', () => {
    const products = [makeProduct({ user: { can_sell_via_hub: false, user_type: 'regular', can_sell_sealed_with_ct_zero: false } })];
    expect(filterCtZeroOffers(products, defaultFilters)).toHaveLength(0);
  });

  it('filters by condition when condition_required is set', () => {
    const products = [
      makeProduct({ properties_hash: { condition: 'Near Mint', mtg_language: 'en', mtg_foil: false } }),
      makeProduct({ properties_hash: { condition: 'Played', mtg_language: 'en', mtg_foil: false } }),
    ];
    const filters: CardFilters = { condition: 'Near Mint', language: 'en', onlyZero: true };
    expect(filterCtZeroOffers(products, filters)).toHaveLength(1);
  });

  it('filters by language', () => {
    const products = [
      makeProduct({ properties_hash: { condition: 'Near Mint', mtg_language: 'en', mtg_foil: false } }),
      makeProduct({ properties_hash: { condition: 'Near Mint', mtg_language: 'de', mtg_foil: false } }),
    ];
    expect(filterCtZeroOffers(products, defaultFilters)).toHaveLength(1);
  });

  it('returns empty array when no products match', () => {
    expect(filterCtZeroOffers([], defaultFilters)).toHaveLength(0);
  });
});

describe('findCheapestPrice', () => {
  it('returns lowest price from filtered offers', () => {
    const products = [
      makeProduct({ price: { cents: 300, formatted: 'EUR 3.00' } }),
      makeProduct({ price: { cents: 100, formatted: 'EUR 1.00' } }),
      makeProduct({ price: { cents: 200, formatted: 'EUR 2.00' } }),
    ];
    expect(findCheapestPrice(products, defaultFilters)).toBe(100);
  });

  it('returns null when no offers match filters', () => {
    const products = [makeProduct({ user: { can_sell_via_hub: false, user_type: 'regular', can_sell_sealed_with_ct_zero: false } })];
    expect(findCheapestPrice(products, defaultFilters)).toBeNull();
  });

  it('returns null for empty products array', () => {
    expect(findCheapestPrice([], defaultFilters)).toBeNull();
  });
});
