import { useEffect, useMemo, useState } from 'react';
import type { MonitoredCardWithPrice } from '../lib/cardtrader-types';
import { CardRow } from './CardRow';

export const FILTER_KEY = 'cardtrader-dashboard-filters';

export type SortField = 'price' | 'variation' | '';
export type SortDirection = 'asc' | 'desc';

export interface DashboardFilters {
  search: string;
  expansionFilter: string;
  wishlistFilter: string;
  sortField: SortField;
  sortDirection: SortDirection;
}

export const DEFAULT_FILTERS: DashboardFilters = {
  search: '',
  expansionFilter: '',
  wishlistFilter: '',
  sortField: '',
  sortDirection: 'asc',
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

function calcVariation(card: MonitoredCardWithPrice): number | null {
  if (card.latest_price_cents === null || card.baseline_price_cents === null || card.baseline_price_cents === 0) {
    return null;
  }
  return ((card.latest_price_cents - card.baseline_price_cents) / card.baseline_price_cents) * 100;
}

export function CardList({ cards, wishlists, onRuleSaved }: CardListProps) {
  const saved = loadFilters();
  const [search, setSearch] = useState<string>(saved.search);
  const [expansionFilter, setExpansionFilter] = useState<string>(saved.expansionFilter);
  const [wishlistFilter, setWishlistFilter] = useState<string>(saved.wishlistFilter);
  const [sortField, setSortField] = useState<SortField>(saved.sortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(saved.sortDirection);

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
      localStorage.setItem(FILTER_KEY, JSON.stringify({ search, expansionFilter, wishlistFilter, sortField, sortDirection }));
    } catch {
      // Ignore storage errors (private browsing, storage full)
    }
  }, [search, expansionFilter, wishlistFilter, sortField, sortDirection]);

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

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      let valA: number | null;
      let valB: number | null;
      if (sortField === 'price') {
        valA = a.latest_price_cents;
        valB = b.latest_price_cents;
      } else {
        valA = calcVariation(a);
        valB = calcVariation(b);
      }
      // Push nulls to the end regardless of direction
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [filtered, sortField, sortDirection]);

  function toggleSort(field: SortField) {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortField('');
      setSortDirection('asc');
    }
  }

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

      <div className="mb-3 flex gap-2">
        <span className="self-center text-xs text-slate-500">Sort:</span>
        <button
          type="button"
          onClick={() => toggleSort('price')}
          className={`rounded border px-2 py-1 text-xs transition-colors ${
            sortField === 'price'
              ? 'border-blue-500/50 text-blue-400'
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-100'
          }`}
        >
          Price{sortField === 'price' ? (sortDirection === 'asc' ? ' \u25b2' : ' \u25bc') : ''}
        </button>
        <button
          type="button"
          onClick={() => toggleSort('variation')}
          className={`rounded border px-2 py-1 text-xs transition-colors ${
            sortField === 'variation'
              ? 'border-blue-500/50 text-blue-400'
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-100'
          }`}
        >
          Variation{sortField === 'variation' ? (sortDirection === 'asc' ? ' \u25b2' : ' \u25bc') : ''}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-slate-400">No cards found.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {sorted.map((card) => (
            <CardRow key={card.id} card={card} wishlistName={wishlistMap.get(card.wishlist_id)} onRuleSaved={onRuleSaved} />
          ))}
        </div>
      )}
    </div>
  );
}
