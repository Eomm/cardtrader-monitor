import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CardList } from '../components/CardList';
import { ImportWishlistForm } from '../components/ImportWishlistForm';
import { useAuth } from '../contexts/AuthContext';
import type { MonitoredCardWithPrice } from '../lib/cardtrader-types';
import { sortCards } from '../lib/cardtrader-utils';
import { supabase } from '../lib/supabase';

export function DashboardPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<MonitoredCardWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [hasTelegram, setHasTelegram] = useState<boolean | null>(null);

  const fetchCards = useCallback(async () => {
    setError(null);

    try {
      // Fetch all monitored cards (RLS scopes to current user)
      const { data: monitoredCards, error: cardsError } = await supabase
        .from('monitored_cards')
        .select('*, ct_expansions(name)');

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

      // Merge cards with latest prices, sort active first by price
      const merged: MonitoredCardWithPrice[] = monitoredCards.map((card) => ({
        ...card,
        latest_price_cents: latestPriceMap.get(card.id) ?? null,
      }));

      setCards(sortCards(merged));
    } catch {
      setError('Failed to load cards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSettings = useCallback(async () => {
    const [tokenResult, profileResult] = await Promise.all([
      supabase.rpc('has_api_token'),
      user
        ? supabase.from('profiles').select('telegram_chat_id').eq('id', user.id).single()
        : Promise.resolve({ data: null, error: null }),
    ]);
    setHasToken(tokenResult.data ?? false);
    setHasTelegram(!!profileResult.data?.telegram_chat_id);
  }, [user]);

  useEffect(() => {
    fetchCards();
    checkSettings();
  }, [fetchCards, checkSettings]);

  const handleImportComplete = () => {
    fetchCards();
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <svg
          aria-hidden="true"
          className="h-8 w-8 animate-spin text-blue-500"
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
          <p className="mb-4 text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchCards();
            }}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const settingsComplete = hasToken === true && hasTelegram === true;

  // Empty state: show full import form or setup prompt
  if (cards.length === 0) {
    if (!settingsComplete && hasToken !== null) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-700">
              <svg
                aria-hidden="true"
                className="h-10 w-10 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>

            <h2 className="mb-2 text-2xl font-bold text-slate-100">Complete your setup</h2>
            <p className="mb-6 text-slate-400">
              Before importing wishlists, configure the missing settings:
            </p>

            <div className="mb-6 space-y-3 text-left">
              <div className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-800 px-4 py-3">
                <span className={hasToken ? 'text-green-400' : 'text-red-500'}>
                  {hasToken ? '✓' : '✗'}
                </span>
                <span className="text-sm text-slate-300">CardTrader API token</span>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-800 px-4 py-3">
                <span className={hasTelegram ? 'text-green-400' : 'text-red-500'}>
                  {hasTelegram ? '✓' : '✗'}
                </span>
                <span className="text-sm text-slate-300">Telegram bot chat ID</span>
              </div>
            </div>

            <Link
              to="/settings"
              className="inline-flex items-center justify-center rounded-md bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600"
            >
              Go to Settings
            </Link>
          </div>
        </div>
      );
    }

    return <ImportWishlistForm onImportComplete={handleImportComplete} />;
  }

  // Cards exist: compact import form + card grid
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <ImportWishlistForm onImportComplete={handleImportComplete} compact />
      </div>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      <CardList cards={cards} />
    </div>
  );
}
