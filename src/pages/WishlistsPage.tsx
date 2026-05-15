import { useCallback, useEffect, useRef, useState } from 'react';
import { ImportWishlistForm } from '../components/ImportWishlistForm';
import { supabase } from '../lib/supabase';

type Wishlist = {
  id: string;
  cardtrader_wishlist_id: string;
  name: string;
  last_synced_at: string | null;
  created_at: string;
};

const CONFIRM_TIMEOUT_MS = 4000;

export function WishlistsPage() {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWishlists = useCallback(async () => {
    setError(null);
    const [{ data: lists, error: listError }, { data: cards, error: cardError }] =
      await Promise.all([
        supabase
          .from('wishlists')
          .select('id, cardtrader_wishlist_id, name, last_synced_at, created_at')
          .order('created_at', { ascending: true }),
        supabase.from('monitored_cards').select('wishlist_id'),
      ]);

    if (listError) {
      setError(listError.message);
      setLoading(false);
      return;
    }

    const counts: Record<string, number> = {};
    if (cards && !cardError) {
      for (const row of cards) {
        counts[row.wishlist_id] = (counts[row.wishlist_id] ?? 0) + 1;
      }
    }

    setWishlists(lists ?? []);
    setCardCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWishlists();
  }, [fetchWishlists]);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const clearConfirmTimer = () => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
  };

  const handleDeleteClick = async (wishlist: Wishlist) => {
    if (deletingId) return;

    if (pendingDeleteId !== wishlist.id) {
      clearConfirmTimer();
      setPendingDeleteId(wishlist.id);
      confirmTimerRef.current = setTimeout(() => {
        setPendingDeleteId(null);
        confirmTimerRef.current = null;
      }, CONFIRM_TIMEOUT_MS);
      return;
    }

    clearConfirmTimer();
    setPendingDeleteId(null);
    setDeletingId(wishlist.id);
    setError(null);

    const { error: deleteError } = await supabase.from('wishlists').delete().eq('id', wishlist.id);

    setDeletingId(null);

    if (deleteError) {
      setError(`Failed to delete "${wishlist.name}": ${deleteError.message}`);
      return;
    }

    fetchWishlists();
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

  if (wishlists.length === 0) {
    return <ImportWishlistForm onImportComplete={fetchWishlists} />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <ImportWishlistForm onImportComplete={fetchWishlists} compact />
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <h1 className="mb-3 text-lg font-semibold text-slate-100">Your wishlists</h1>
      <ul className="flex flex-col gap-2">
        {wishlists.map((w) => {
          const isPending = pendingDeleteId === w.id;
          const isDeleting = deletingId === w.id;
          const cardCount = cardCounts[w.id] ?? 0;
          const lastSynced = w.last_synced_at ? w.last_synced_at.slice(0, 10) : 'never';

          return (
            <li
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-800 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={`https://www.cardtrader.com/wishlists/${w.cardtrader_wishlist_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
                >
                  <span className="truncate">{w.name}</span>
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
                <p className="mt-0.5 text-xs text-slate-400">
                  {cardCount} {cardCount === 1 ? 'card' : 'cards'} · last synced {lastSynced}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteClick(w)}
                disabled={isDeleting}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isPending
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'border border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100'
                }`}
              >
                {isDeleting ? 'Deleting…' : isPending ? 'Confirm delete?' : 'Delete'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
