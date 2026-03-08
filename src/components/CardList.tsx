import { useMemo, useState } from 'react';
import type { MonitoredCardWithPrice } from '../lib/cardtrader-types';
import { CardRow } from './CardRow';

type CardListProps = {
  cards: MonitoredCardWithPrice[];
};

export function CardList({ cards }: CardListProps) {
  const [search, setSearch] = useState('');
  const [expansionFilter, setExpansionFilter] = useState('');

  const expansions = useMemo(() => {
    const names = new Set<string>();
    for (const card of cards) {
      const name = card.ct_expansions?.name;
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const filtered = cards.filter((card) => {
    if (search && !card.card_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (expansionFilter && card.ct_expansions?.name !== expansionFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-slate-600"
        />
        {expansions.length > 1 && (
          <select
            value={expansionFilter}
            onChange={(e) => setExpansionFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-slate-600"
          >
            <option value="">All expansions</option>
            {expansions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

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
