export function DashboardPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        {/* Empty state icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-steel/20">
          <svg
            aria-hidden="true"
            className="h-10 w-10 text-steel"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-deep-space dark:text-papaya mb-2">
          No cards being monitored yet
        </h2>
        <p className="text-deep-space/60 dark:text-papaya/60 mb-6">
          Once you import a wishlist from CardTrader, your monitored cards and price changes will
          appear here.
        </p>
        <p className="text-sm text-steel">
          Head to <span className="font-medium">Settings</span> to add your CardTrader API token,
          then import a wishlist to get started.
        </p>
      </div>
    </div>
  );
}
