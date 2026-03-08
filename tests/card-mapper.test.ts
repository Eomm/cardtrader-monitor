import { describe, expect, it } from 'vitest';
import type { Blueprint } from '../src/lib/cardtrader-types';
import { mapBlueprintToCard } from '../src/lib/cardtrader-utils';

describe('mapBlueprintToCard', () => {
  const blueprint: Blueprint = {
    id: 42,
    name: 'Lightning Bolt',
    game_id: 1,
    fixed_properties: { collector_number: '141' },
    image_url: 'https://example.com/bolt.jpg',
    scryfall_id: 'abc-123',
  };

  it('maps blueprint fields to monitored_card shape', () => {
    const result = mapBlueprintToCard(blueprint, 101);
    expect(result).toEqual({
      blueprint_id: 42,
      card_name: 'Lightning Bolt',
      game_id: 1,
      collector_number: '141',
      image_url: 'https://example.com/bolt.jpg',
      expansion_id: 101,
    });
  });

  it('handles blueprint with missing optional fields', () => {
    const minimal: Blueprint = {
      id: 99,
      name: 'Mystery Card',
      game_id: 2,
      fixed_properties: { collector_number: '' },
      image_url: '',
      scryfall_id: '',
    };
    const result = mapBlueprintToCard(minimal, 202);
    expect(result.blueprint_id).toBe(99);
    expect(result.card_name).toBe('Mystery Card');
    expect(result.expansion_id).toBe(202);
  });
});
