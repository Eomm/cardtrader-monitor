export function formatEur(cents: number): string {
  return `EUR ${(cents / 100).toFixed(2)}`;
}

export function PriceChange({
  baseline,
  current,
}: {
  baseline: number | null;
  current: number | null;
}) {
  if (current === null) {
    return <span className="text-sm text-blue-500">No offers</span>;
  }

  if (baseline === null || baseline === 0) {
    return <span className="text-sm text-blue-500">No baseline</span>;
  }

  if (current === baseline) {
    return <span className="text-sm text-blue-500">Baseline</span>;
  }

  const pct = ((current - baseline) / baseline) * 100;
  const isDown = current < baseline;

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${isDown ? 'text-green-400' : 'text-red-500'}`}
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
