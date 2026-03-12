import { Link } from 'react-router';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

export function HowItWorksPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {user && <Navbar />}
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">How It Works</h1>
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
          {/* Section 1: Setup */}
          <section id="setup">
            <h2 className="mb-3 text-xl font-semibold text-slate-100">How to setup</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                To get started, you need two things: a{' '}
                <strong className="text-slate-100">CardTrader API token</strong> and a{' '}
                <strong className="text-slate-100">Telegram chat ID</strong>.
              </p>
              <p>
                Generate your API token from your{' '}
                <a
                  href="https://www.cardtrader.com/full-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 underline"
                >
                  CardTrader API settings
                </a>
                . Paste it into the Settings page of this app. The token is encrypted and stored
                securely -- it is only used to read your wishlists and check marketplace prices.
              </p>
              <p>
                Your imported wishlists are{' '}
                <strong className="text-slate-100">synced once a day</strong> with CardTrader. If
                you add or remove cards from a wishlist on CardTrader, the changes will be
                automatically reflected here within 24 hours.
              </p>
              <p>
                For Telegram notifications, start a chat with{' '}
                <a
                  href="https://t.me/card_trader_monitor_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 underline"
                >
                  @card_trader_monitor_bot
                </a>{' '}
                on Telegram and send{' '}
                <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">/start</code>.
                The bot will reply with your chat ID. Enter that ID in the Settings page and click
                "Save & Test" to verify the connection.
              </p>
            </div>
          </section>

          {/* Section 2: Price Detection */}
          <section id="prices">
            <h2 className="mb-3 text-xl font-semibold text-slate-100">How price detection works</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                Prices are checked <strong className="text-slate-100">every hour</strong> via an
                automated GitHub Actions workflow. For each monitored card, the system queries the
                CardTrader marketplace for the cheapest matching offer.
              </p>
              <p>
                "Matching" means the offer satisfies the card's language, condition, and foil
                preferences. If the CT Zero filter is enabled, only offers from qualified sellers
                (professional sellers with hub shipping) are considered.
              </p>
              <p>
                Each card has a <strong className="text-slate-100">baseline price</strong> set at
                import time. Price changes are always measured as a percentage relative to this
                baseline. You can see both the current and baseline prices on each card's detail
                page.
              </p>
            </div>
          </section>

          {/* Section 3: Notification Rules */}
          <section id="rules">
            <h2 className="mb-3 text-xl font-semibold text-slate-100">
              How notification rules work
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                The dashboard shows the{' '}
                <strong className="text-slate-100">first active rule</strong> for each card directly
                in the card row. You can edit the rule inline -- click on it to change the threshold,
                direction, or target price without opening the card detail page. Changes are saved
                immediately.
              </p>
              <p>
                Each card can have <strong className="text-slate-100">threshold rules</strong> that
                trigger when the price moves by a certain percentage from the baseline. You choose
                the percentage and the direction (up, down, or both).
              </p>
              <p>
                When a threshold is crossed, you get a Telegram notification with the card name, old
                price, new price, and a direct link to the CardTrader listing.
              </p>
              <p>
                You can also set a <strong className="text-slate-100">fixed price</strong> rule that
                triggers when the market price crosses a specific EUR target. Choose a direction:{' '}
                <strong className="text-slate-100">down</strong> to be notified when the price drops
                below your target, <strong className="text-slate-100">up</strong> when it rises
                above, or <strong className="text-slate-100">both</strong> for either crossing.
                Unlike threshold rules which are percentage-based relative to the baseline, fixed
                price rules work with an absolute EUR value -- useful when you know exactly how much
                you are willing to pay.
              </p>
              <p>
                You can also set <strong className="text-slate-100">stability rules</strong> that
                trigger when a price stays within a certain percentage range for a number of
                consecutive days. For example, a stability rule with 5% range and 3 days will notify
                you when a card's price has remained stable — useful for spotting good buying
                opportunities after a price drop settles.
              </p>
              <p>
                To avoid spam, there is a{' '}
                <strong className="text-slate-100">24-hour cooldown</strong> per card. After an
                alert fires, the same card will not trigger another notification for 24 hours --
                unless the price moves further beyond the threshold compared to the last notified
                price. Only one alert per card per hourly run is sent.
              </p>
            </div>
          </section>

          {/* Section 4: Current Limits */}
          <section id="limits">
            <h2 className="mb-3 text-xl font-semibold text-slate-100">Current limits</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                Each user can import a maximum of{' '}
                <strong className="text-slate-100">2 wishlists</strong>. There is no limit on the
                number of cards per wishlist.
              </p>
              <p>
                This is an <strong className="text-slate-100">invite-only</strong> service -- it is
                not open for public signup. If you have access, it means someone shared it with you.
              </p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
