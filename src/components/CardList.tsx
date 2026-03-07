import { useState } from 'react';
import type { MonitoredCardWithPrice } from '../lib/cardtrader-types';
import { CardRow } from './CardRow';

type CardListProps = {
  cards: MonitoredCardWithPrice[];
};

export function CardList({ cards }: CardListProps) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? cards.filter((card) => card.card_name.toLowerCase().includes(search.toLowerCase()))
    : cards;

  return (
    <div>
      <input
        type="text"
        placeholder="Search cards..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded border border-steel/20 bg-white px-3 py-2 text-deep-space placeholder-steel/50 outline-none transition-colors focus:border-steel/40 dark:border-steel/10 dark:bg-deep-space/60 dark:text-papaya dark:placeholder-steel/40 dark:focus:border-steel/30"
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-deep-space/60 dark:text-papaya/60">No cards found.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
