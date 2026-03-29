import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Footer } from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-red-500" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
    if (error) {
      setError(error.message);
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 px-4">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md">
          {/* Hero */}
          <div className="text-center mb-10">
            <span className="inline-block rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1 mb-4">
              BETA
            </span>
            <h1 className="text-4xl font-bold text-slate-100 mb-3">CardTrader Monitor</h1>
            <p className="text-lg text-slate-300">
              Stop refreshing CardTrader. Get notified when prices drop on the Magic: The Gathering cards you care about.
            </p>
            <ul className="mt-4 space-y-1">
              <li className="text-sm text-slate-400">&#10003; Import your MTG wishlists</li>
              <li className="text-sm text-slate-400">&#10003; Set custom price alerts</li>
              <li className="text-sm text-slate-400">&#10003; Get Telegram notifications</li>
            </ul>
          </div>

          {/* Sign-in card */}
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-6 text-center">Get started</h2>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {signingIn ? 'Redirecting...' : 'Sign in with Google'}
            </button>

            {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}

            <p className="mt-6 text-xs text-slate-500 text-center">
              Sign in to import your CardTrader MTG wishlists and set up price alerts.
            </p>
          </div>

          {/* Beta disclaimer */}
          <p className="text-xs text-slate-500 text-center mt-4">
            This is a beta project. The service may be modified or discontinued at any time.
          </p>

          {/* Navigation links */}
          <div className="flex gap-4 justify-center mt-3">
            <Link to="/how-it-works" className="text-sm text-blue-500 hover:text-blue-400 underline">
              How it works
            </Link>
            <Link to="/privacy" className="text-sm text-blue-500 hover:text-blue-400 underline">
              Privacy
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
