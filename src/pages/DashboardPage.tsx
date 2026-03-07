import { useCallback, useEffect, useState } from 'react';
import type { MonitoredCardWithPrice } from '../lib/cardtrader-types';
import { CardList } from '../components/CardList';
import { ImportWishlistForm } from '../components/ImportWishlistForm';
import { supabase } from '../lib/supabase';

export function DashboardPage() {
  const [cards, setCards] = useState<MonitoredCardWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    setError(null);

    try {
      // Fetch active monitored cards (RLS scopes to current user)
      const { data: monitoredCards, error: cardsError } = await supabase
        .from('monitored_cards')
        .select('*')
        .eq('is_active', true)
        .order('card_name');

      if (cardsError) {
        setError(cardsError.message);
        setLoading(false);
        return;
      }

      if (!monitoredCards || monitoredCards.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      // Fetch latest price snapshot for each card
      const cardIds = monitoredCards.map((c) => c.id);
      const { data: snapshots, error: snapError } = await supabase
        .from('price_snapshots')
        .select('monitored_card_id, price_cents, recorded_at')
        .in('monitored_card_id', cardIds)
        .order('recorded_at', { ascending: false });

      if (snapError) {
        // Cards loaded, prices failed -- show cards without prices
        console.error('Failed to fetch price snapshots:', snapError.message);
      }

      // Build a map of latest price per card (first occurrence is most recent due to ordering)
      const latestPriceMap = new Map<string, number>();
      if (snapshots) {
        for (const snap of snapshots) {
          if (!latestPriceMap.has(snap.monitored_card_id)) {
            latestPriceMap.set(snap.monitored_card_id, snap.price_cents);
          }
        }
      }

      // Merge cards with latest prices
      const merged: MonitoredCardWithPrice[] = monitoredCards.map((card) => ({
        ...card,
        latest_price_cents: latestPriceMap.get(card.id) ?? null,
      }));

      setCards(merged);
    } catch {
      setError('Failed to load cards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleImportComplete = () => {
    fetchCards();
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <svg
          aria-hidden="true"
          className="h-8 w-8 animate-spin text-steel"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  if (error && cards.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4 text-flag-red">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchCards();
            }}
            className="rounded-md bg-steel px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-steel/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state: show full import form
  if (cards.length === 0) {
    return <ImportWishlistForm onImportComplete={handleImportComplete} />;
  }

  // Cards exist: compact import form + card grid
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <ImportWishlistForm onImportComplete={handleImportComplete} compact />
      </div>
      {error && <p className="mb-4 text-sm text-flag-red">{error}</p>}
      <CardList cards={cards} />
    </div>
  );
}
