import { useState } from 'react';
import { supabase } from '../lib/supabase';

type ImportResult = {
  imported: number;
  skipped: number;
  wishlist_id: string;
  details: Array<{ card_name: string; status: 'imported' | 'skipped'; reason?: string }>;
};

type ImportWishlistFormProps = {
  onImportComplete: () => void;
  compact?: boolean;
};

export function ImportWishlistForm({ onImportComplete, compact = false }: ImportWishlistFormProps) {
  const [wishlistUrl, setWishlistUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleImport = async () => {
    if (!wishlistUrl.trim()) {
      setError('Please enter a wishlist URL');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsImporting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<ImportResult>(
        'import-wishlist',
        { body: { wishlistUrl } },
      );

      if (fnError) {
        setError(fnError.message || 'Import failed. Please try again.');
        return;
      }

      if (!data) {
        setError('No response from import function.');
        return;
      }

      const parts: string[] = [`Imported ${data.imported} cards`];
      if (data.skipped > 0) {
        parts.push(`${data.skipped} skipped`);
      }
      setSuccessMessage(`${parts.join(', ')}.`);
      setWishlistUrl('');
      onImportComplete();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  if (compact) {
    return (
      <div className="w-full">
        {successMessage && (
          <p className="mb-2 text-sm text-green-400">{successMessage}</p>
        )}
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <input
            type="url"
            value={wishlistUrl}
            onChange={(e) => setWishlistUrl(e.target.value)}
            placeholder="https://www.cardtrader.com/wishlists/12345"
            disabled={isImporting}
            className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting && <Spinner />}
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        {/* Empty state icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-700">
          <svg
            aria-hidden="true"
            className="h-10 w-10 text-blue-500"
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

        <h2 className="mb-2 text-2xl font-bold text-slate-100">
          No cards being monitored yet
        </h2>
        <p className="mb-6 text-slate-400">
          Paste your CardTrader wishlist URL below to import cards and start tracking prices.
        </p>

        {successMessage && (
          <p className="mb-4 text-sm font-medium text-green-400">
            {successMessage}
          </p>
        )}
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <div className="flex flex-col gap-3">
          <input
            type="url"
            value={wishlistUrl}
            onChange={(e) => setWishlistUrl(e.target.value)}
            placeholder="https://www.cardtrader.com/wishlists/12345"
            disabled={isImporting}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting && <Spinner />}
            {isImporting ? 'Importing wishlist...' : 'Import Wishlist'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
