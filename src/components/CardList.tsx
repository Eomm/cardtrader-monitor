import { useEffect, useMemo, useState } from 'react';
import type { MonitoredCardWithPrice } from '../lib/cardtrader-types';
import { CardRow } from './CardRow';

export const FILTER_KEY = 'cardtrader-dashboard-filters';

export interface DashboardFilters {
  search: string;
  expansionFilter: string;
  wishlistFilter: string;
}

export const DEFAULT_FILTERS: DashboardFilters = {
  search: '',
  expansionFilter: '',
  wishlistFilter: '',
};

export function loadFilters(): DashboardFilters {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
}

type CardListProps = {
  cards: MonitoredCardWithPrice[];
  wishlists?: { id: string; name: string }[];
  onRuleSaved?: () => void;
};

export function CardList({ cards, wishlists, onRuleSaved }: CardListProps) {
  const saved = loadFilters();
  const [search, setSearch] = useState<string>(saved.search);
  const [expansionFilter, setExpansionFilter] = useState<string>(saved.expansionFilter);
  const [wishlistFilter, setWishlistFilter] = useState<string>(saved.wishlistFilter);

  const wishlistMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of (wishlists ?? [])) {
      map.set(w.id, w.name);
    }
    return map;
  }, [wishlists]);

  const expansions = useMemo(() => {
    const names = new Set<string>();
    for (const card of cards) {
      const name = card.ct_expansions?.name;
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [cards]);

  // Persist filters to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ search, expansionFilter, wishlistFilter }));
    } catch {
      // Ignore storage errors (private browsing, storage full)
    }
  }, [search, expansionFilter, wishlistFilter]);

  // Validate persisted expansion filter still exists
  useEffect(() => {
    if (expansionFilter && expansions.length > 0 && !expansions.includes(expansionFilter)) {
      setExpansionFilter('');
    }
  }, [expansions, expansionFilter]);

  // Validate persisted wishlist filter still exists
  useEffect(() => {
    if (
      wishlistFilter &&
      wishlists &&
      wishlists.length > 0 &&
      !wishlists.some((w) => w.id === wishlistFilter)
    ) {
      setWishlistFilter('');
    }
  }, [wishlists, wishlistFilter]);

  const filtered = cards.filter((card) => {
    if (search && !card.card_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (expansionFilter && card.ct_expansions?.name !== expansionFilter) return false;
    if (wishlistFilter && card.wishlist_id !== wishlistFilter) return false;
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
        {wishlists && wishlists.length >= 1 && (
          <select
            value={wishlistFilter}
            onChange={(e) => setWishlistFilter(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-slate-600"
          >
            <option value="">All wishlists</option>
            {wishlists.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
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
            <CardRow key={card.id} card={card} wishlistName={wishlistMap.get(card.wishlist_id)} onRuleSaved={onRuleSaved} />
          ))}
        </div>
      )}
    </div>
  );
}
