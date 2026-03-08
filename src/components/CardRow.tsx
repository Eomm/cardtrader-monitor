import { useNavigate } from 'react-router';
import type { MonitoredCardWithPrice } from '../lib/cardtrader-types';
import { languageToFlag } from '../lib/cardtrader-utils';
import { PriceChange, formatEur } from './PriceDisplay';

type CardRowProps = {
  card: MonitoredCardWithPrice;
};

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-steel/10">
      <svg
        aria-hidden="true"
        className="h-6 w-6 text-steel/40"
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
  );
}

export function CardRow({ card }: CardRowProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/cards/${card.id}`)}
      className={`flex w-full items-center gap-3 rounded-lg border border-steel/20 px-3 py-2 text-left transition-colors hover:bg-steel/5 dark:border-steel/10 dark:hover:bg-steel/10 ${
        !card.is_active ? 'opacity-50' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded">
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.card_name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* Name + flag */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-deep-space dark:text-papaya">
          {card.card_name} <span className="text-sm">{languageToFlag(card.language_required)}</span>
        </p>
        <p className="truncate text-sm text-deep-space/60 dark:text-papaya/60">
          {card.expansion_name}
        </p>
      </div>

      {/* Price + change */}
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-medium text-deep-space dark:text-papaya">
          {card.latest_price_cents !== null ? formatEur(card.latest_price_cents) : '---'}
        </span>
        <PriceChange baseline={card.baseline_price_cents} current={card.latest_price_cents} />
      </div>
    </button>
  );
}
