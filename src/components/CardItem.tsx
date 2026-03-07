export type MonitoredCardWithPrice = {
  id: string;
  blueprint_id: number;
  card_name: string;
  expansion_name: string;
  game_id: number;
  collector_number: string | null;
  image_url: string | null;
  baseline_price_cents: number | null;
  notification_rule: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  latest_price_cents: number | null;
};

type CardItemProps = {
  card: MonitoredCardWithPrice;
};

function formatEur(cents: number): string {
  return `EUR ${(cents / 100).toFixed(2)}`;
}

function PriceChange({
  baseline,
  current,
}: {
  baseline: number | null;
  current: number | null;
}) {
  if (current === null) {
    return <span className="text-sm text-steel">No offers</span>;
  }

  if (baseline === null || baseline === 0) {
    return <span className="text-sm text-steel">No baseline</span>;
  }

  if (current === baseline) {
    return <span className="text-sm text-steel">Baseline</span>;
  }

  const pct = ((current - baseline) / baseline) * 100;
  const isDown = current < baseline;

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${isDown ? 'text-green-600 dark:text-green-400' : 'text-flag-red'}`}
    >
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        {isDown ? (
          <path
            fillRule="evenodd"
            d="M10 18a.75.75 0 01-.75-.75V4.66L4.53 9.39a.75.75 0 11-1.06-1.06l6.25-6.25a.75.75 0 011.06 0l6.25 6.25a.75.75 0 11-1.06 1.06L11.25 4.66v12.59A.75.75 0 0110 18z"
            clipRule="evenodd"
            transform="rotate(180 10 10)"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M10 2a.75.75 0 01.75.75v12.59l4.72-4.73a.75.75 0 111.06 1.06l-6.25 6.25a.75.75 0 01-1.06 0L2.97 11.67a.75.75 0 111.06-1.06l4.72 4.73V2.75A.75.75 0 0110 2z"
            clipRule="evenodd"
            transform="rotate(180 10 10)"
          />
        )}
      </svg>
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-steel/10">
      <svg
        aria-hidden="true"
        className="h-8 w-8 text-steel/40"
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

export function CardItem({ card }: CardItemProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-steel/20 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-steel/10 dark:bg-deep-space/60">
      {/* Card image */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-steel/5">
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

      {/* Card info */}
      <div className="p-3">
        <h3 className="truncate font-bold text-deep-space dark:text-papaya">{card.card_name}</h3>
        <p className="truncate text-sm text-deep-space/60 dark:text-papaya/60">
          {card.expansion_name}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-medium text-deep-space dark:text-papaya">
            {card.latest_price_cents !== null ? formatEur(card.latest_price_cents) : '---'}
          </span>
          <PriceChange baseline={card.baseline_price_cents} current={card.latest_price_cents} />
        </div>
      </div>
    </div>
  );
}
