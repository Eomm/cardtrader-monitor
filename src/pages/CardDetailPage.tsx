import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PriceChange, formatEur } from '../components/PriceDisplay';
import { RuleEditor } from '../components/RuleEditor';
import type { MonitoredCardWithPrice } from '../lib/cardtrader-types';
import { languageToFlag } from '../lib/cardtrader-utils';
import { supabase } from '../lib/supabase';

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<MonitoredCardWithPrice | null>(null);
  const [wishlistInfo, setWishlistInfo] = useState<{
    name: string;
    cardtrader_wishlist_id: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingZero, setTogglingZero] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const fetchCard = useCallback(async () => {
    if (!id) return;
    setError(null);

    try {
      const { data: cardData, error: cardError } = await supabase
        .from('monitored_cards')
        .select('*, ct_expansions(name)')
        .eq('id', id)
        .single();

      if (cardError) {
        if (cardError.code === 'PGRST116') {
          setCard(null);
          setLoading(false);
          return;
        }
        setError(cardError.message);
        setLoading(false);
        return;
      }

      // Fetch latest price
      const { data: priceData } = await supabase
        .from('price_snapshots')
        .select('price_cents')
        .eq('monitored_card_id', id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      const merged: MonitoredCardWithPrice = {
        ...cardData,
        latest_price_cents: priceData?.price_cents ?? null,
      };

      setCard(merged);

      // Fetch wishlist info for the link
      if (cardData.wishlist_id) {
        const { data: wData } = await supabase
          .from('wishlists')
          .select('name, cardtrader_wishlist_id')
          .eq('id', cardData.wishlist_id)
          .single();
        if (wData) {
          setWishlistInfo(wData);
        }
      }
    } catch {
      setError('Failed to load card. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  async function handleToggleZero() {
    if (!card) return;
    setTogglingZero(true);

    const { error: updateError } = await supabase
      .from('monitored_cards')
      .update({ only_zero: !card.only_zero })
      .eq('id', card.id);

    setTogglingZero(false);

    if (!updateError) {
      setCard((prev) => (prev ? { ...prev, only_zero: !prev.only_zero } : prev));
    }
  }

  async function handleToggleActive() {
    if (!card) return;
    setTogglingActive(true);

    const newActive = !card.is_active;
    const { error: updateError } = await supabase
      .from('monitored_cards')
      .update({ is_active: newActive })
      .eq('id', card.id);

    setTogglingActive(false);
    setConfirmStop(false);

    if (!updateError) {
      if (!newActive) {
        // Stopped monitoring, navigate back
        navigate('/dashboard');
      } else {
        // Resumed monitoring, update local state
        setCard((prev) => (prev ? { ...prev, is_active: true } : prev));
      }
    }
  }

  function handleRulesSaved() {
    fetchCard();
  }

  // Loading state
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

  // Error state
  if (error && !card) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchCard();
            }}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not found
  if (!card) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-slate-400">Card not found.</p>
      </div>
    );
  }

  const foilLabel =
    card.foil_required === true ? 'Yes' : card.foil_required === false ? 'No' : 'Any';

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Card image */}
        <div className="flex-shrink-0">
          <div className="mx-auto h-72 w-52 overflow-hidden rounded-lg md:mx-0">
            {card.image_url ? (
              <img
                src={card.image_url}
                alt={card.card_name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-700">
                <svg
                  aria-hidden="true"
                  className="h-12 w-12 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Info sections */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Card name */}
          <h1 className="text-xl font-bold text-slate-100">{card.card_name}</h1>

          {/* Section 1: Price */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Price
            </h2>
            <div className="rounded-lg border border-slate-700 p-4">
              <div className="flex flex-wrap items-baseline gap-4">
                <div>
                  <span className="text-xs text-slate-500">Current</span>
                  {card.latest_price_cents !== null ? (
                    <a
                      href={`https://www.cardtrader.com/it/cards/${card.blueprint_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-lg font-bold text-blue-500 underline decoration-blue-500/30 transition-colors hover:text-blue-400"
                    >
                      {formatEur(card.latest_price_cents)}
                    </a>
                  ) : (
                    <p className="text-lg font-bold text-slate-500">---</p>
                  )}
                </div>
                <div>
                  <span className="text-xs text-slate-500">Baseline</span>
                  <p className="text-lg font-medium text-slate-400">
                    {card.baseline_price_cents !== null
                      ? formatEur(card.baseline_price_cents)
                      : '---'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Change</span>
                  <div className="mt-0.5">
                    <PriceChange
                      baseline={card.baseline_price_cents}
                      current={card.latest_price_cents}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Card Properties */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Properties
            </h2>
            <div className="rounded-lg border border-slate-700 p-4">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                {wishlistInfo && (
                  <div>
                    <dt className="text-slate-500">Wishlist</dt>
                    <dd className="font-medium">
                      <a
                        href={`https://www.cardtrader.com/wishlists/${wishlistInfo.cardtrader_wishlist_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline decoration-blue-500/30 transition-colors hover:text-blue-400"
                      >
                        {wishlistInfo.name}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-500">Expansion</dt>
                  <dd className="font-medium">{card.ct_expansions?.name ?? '---'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Condition</dt>
                  <dd className="font-medium">{card.condition_required ?? 'Any'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Language</dt>
                  <dd className="font-medium">
                    {languageToFlag(card.language_required)} {card.language_required.toUpperCase()}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Foil</dt>
                  <dd className="font-medium">{foilLabel}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-slate-500">CT Zero</dt>
                  <dd>
                    <button
                      type="button"
                      onClick={handleToggleZero}
                      disabled={togglingZero}
                      className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
                        card.only_zero ? 'bg-blue-500' : 'bg-slate-600'
                      }`}
                      aria-label={card.only_zero ? 'Disable CT Zero' : 'Enable CT Zero'}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          card.only_zero ? 'translate-x-4' : ''
                        }`}
                      />
                    </button>
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Section 3: Rule Editor */}
          <section>
            <RuleEditor
              cardId={card.id}
              rules={card.notification_rule ?? []}
              onSave={handleRulesSaved}
            />
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Danger Zone
            </h2>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              {card.is_active ? (
                <div>
                  {confirmStop ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-400">Stop monitoring this card?</span>
                      <button
                        type="button"
                        onClick={handleToggleActive}
                        disabled={togglingActive}
                        className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                      >
                        {togglingActive ? 'Stopping...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmStop(false)}
                        className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmStop(true)}
                      className="rounded-md border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      Stop Monitoring
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={togglingActive}
                  className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {togglingActive ? 'Resuming...' : 'Resume Monitoring'}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
