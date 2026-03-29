import { Link } from 'react-router';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

export function PrivacyPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {user && <Navbar />}
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Privacy</h1>
          {!user && (
            <Link
              to="/"
              className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600"
            >
              Go to Login
            </Link>
          )}
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">What data we collect</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                We collect only the minimum data required to provide the service:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong className="text-slate-100">Google account email and name</strong> — used
                  for authentication via Google OAuth.
                </li>
                <li>
                  <strong className="text-slate-100">CardTrader API token</strong> — stored
                  encrypted, used only to fetch your wishlists and marketplace prices on your
                  behalf.
                </li>
                <li>
                  <strong className="text-slate-100">Price snapshots</strong> — historical price
                  data for the cards you choose to monitor.
                </li>
                <li>
                  <strong className="text-slate-100">Telegram chat ID</strong> — stored if you
                  enable Telegram notifications, used exclusively to send price alerts.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">How we use your data</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                Your data is used solely to provide the CardTrader Monitor service — importing
                wishlists, tracking prices, and sending alerts when price conditions are met.
              </p>
              <p>
                We do <strong className="text-slate-100">not</strong> sell, share, or use your data
                for advertising, analytics, or any purpose other than operating this service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">Data storage</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                All data is stored in{' '}
                <strong className="text-slate-100">Supabase</strong>, hosted in the EU. Row-level
                security (RLS) policies are enforced at the database level — users can only access
                their own data. Your CardTrader API token is encrypted before storage.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">Third-party services</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>This service relies on the following third-party providers:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong className="text-slate-100">Google OAuth</strong> — authentication
                </li>
                <li>
                  <strong className="text-slate-100">CardTrader API</strong> — wishlist and
                  marketplace price data
                </li>
                <li>
                  <strong className="text-slate-100">Telegram Bot API</strong> — price alert
                  notifications
                </li>
                <li>
                  <strong className="text-slate-100">Supabase</strong> — database and
                  authentication infrastructure
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">Data deletion</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                You can stop monitoring individual cards at any time from the dashboard. To delete
                your account and all associated data, contact the developer directly. All your data
                will be permanently removed upon request.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">Beta notice</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                This service is provided as-is during a beta period. Data handling practices may
                evolve as the service matures. We will notify users of any significant changes to
                this privacy policy.
              </p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
