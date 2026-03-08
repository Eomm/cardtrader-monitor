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
        className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-slate-600"
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-slate-400">No cards found.</p>
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
