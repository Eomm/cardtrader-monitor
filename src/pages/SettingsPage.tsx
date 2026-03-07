import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function SettingsPage() {
  const { user } = useAuth();

  // --- API Token state ---
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checking, setChecking] = useState(true);

  // --- Telegram state ---
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramInput, setTelegramInput] = useState('');
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramRemoving, setTelegramRemoving] = useState(false);
  const [confirmTelegramRemove, setConfirmTelegramRemove] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(true);

  // --- API Token handlers ---

  const checkTokenStatus = useCallback(async () => {
    setChecking(true);
    const { data, error } = await supabase.rpc('has_api_token');
    if (error) {
      setMessage({ type: 'error', text: `Failed to check token status: ${error.message}` });
    } else {
      setHasToken(data ?? false);
    }
    setChecking(false);
  }, []);

  const fetchTelegramChatId = useCallback(async () => {
    if (!user) return;
    setTelegramLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', user.id)
      .single();

    if (!error && data?.telegram_chat_id) {
      setTelegramChatId(String(data.telegram_chat_id));
      setTelegramInput(String(data.telegram_chat_id));
    }
    setTelegramLoading(false);
  }, [user]);

  useEffect(() => {
    checkTokenStatus();
    fetchTelegramChatId();
  }, [checkTokenStatus, fetchTelegramChatId]);

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.rpc('save_api_token', { token: tokenInput.trim() });
    if (error) {
      setMessage({ type: 'error', text: `Failed to save token: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'API token saved successfully.' });
      setTokenInput('');
      setHasToken(true);
    }
    setSaving(false);
  };

  const handleRemoveToken = async () => {
    setRemoving(true);
    setMessage(null);

    const { error } = await supabase.rpc('remove_api_token');
    if (error) {
      setMessage({ type: 'error', text: `Failed to remove token: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'API token removed.' });
      setHasToken(false);
    }
    setRemoving(false);
    setConfirmRemove(false);
  };

  // --- Telegram handlers ---

  const handleSaveTelegram = async () => {
    const trimmed = telegramInput.trim();
    if (!trimmed) return;

    // Validate numeric
    if (!/^\d+$/.test(trimmed)) {
      setTelegramMessage({ type: 'error', text: 'Chat ID must be a number.' });
      return;
    }

    if (!user) return;

    setTelegramSaving(true);
    setTelegramMessage(null);

    // 1. Update profile with chat ID
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: trimmed })
      .eq('id', user.id);

    if (profileError) {
      setTelegramMessage({
        type: 'error',
        text: `Failed to save chat ID: ${profileError.message}`,
      });
      setTelegramSaving(false);
      return;
    }

    // 2. Send test message via Edge Function
    const { data, error: fnError } = await supabase.functions.invoke('send-test-message', {
      body: { chat_id: trimmed },
    });

    if (fnError) {
      setTelegramChatId(trimmed);
      setTelegramMessage({
        type: 'warning',
        text: 'Chat ID saved but test message failed. Check the ID.',
      });
      setTelegramSaving(false);
      return;
    }

    const result = data as { ok: boolean; error?: string } | null;
    if (result && !result.ok) {
      setTelegramChatId(trimmed);
      setTelegramMessage({
        type: 'warning',
        text: `Chat ID saved but test message failed: ${result.error ?? 'Unknown error'}. Check the ID.`,
      });
      setTelegramSaving(false);
      return;
    }

    setTelegramChatId(trimmed);
    setTelegramMessage({
      type: 'success',
      text: 'Connected! Check your Telegram for a test message.',
    });
    setTelegramSaving(false);
  };

  const handleDisconnectTelegram = async () => {
    if (!user) return;
    setTelegramRemoving(true);
    setTelegramMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: null })
      .eq('id', user.id);

    if (error) {
      setTelegramMessage({
        type: 'error',
        text: `Failed to disconnect: ${error.message}`,
      });
    } else {
      setTelegramMessage({ type: 'success', text: 'Telegram disconnected.' });
      setTelegramChatId('');
      setTelegramInput('');
    }
    setTelegramRemoving(false);
    setConfirmTelegramRemove(false);
  };

  const isConnected = telegramChatId.length > 0;

  return (
    <div className="flex-1 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-deep-space dark:text-papaya mb-8">Settings</h1>

        {/* CardTrader API Token Section */}
        <div className="bg-white dark:bg-deep-space/50 rounded-xl border border-steel/20 shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-deep-space dark:text-papaya mb-2">
              CardTrader API Token
            </h2>
            <p className="text-sm text-deep-space/60 dark:text-papaya/60 mb-6">
              Your API token is required to fetch wishlist data and monitor card prices. You can
              find it in your{' '}
              <a
                href="https://www.cardtrader.com/full-api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-steel underline hover:text-steel/80"
              >
                CardTrader account settings
              </a>
              . The token is stored encrypted and never visible after saving.
            </p>

            {/* Token Status */}
            <div className="flex items-center gap-2 mb-6">
              {checking ? (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-steel border-t-flag-red" />
                  <span className="text-sm text-deep-space/50 dark:text-papaya/50">
                    Checking token status...
                  </span>
                </div>
              ) : hasToken ? (
                <>
                  <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-deep-space dark:text-papaya">
                    Token saved
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block h-3 w-3 rounded-full bg-gray-400" />
                  <span className="text-sm text-deep-space/60 dark:text-papaya/60">
                    No token configured
                  </span>
                </>
              )}
            </div>

            {/* Save/Update Token Form */}
            <div className="space-y-3">
              <label
                htmlFor="api-token"
                className="block text-sm font-medium text-deep-space dark:text-papaya"
              >
                {hasToken ? 'Update token' : 'Add token'}
              </label>
              <div className="relative">
                <input
                  id="api-token"
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste your CardTrader API token"
                  className="w-full px-4 py-2.5 pr-20 rounded-lg border border-steel/30 bg-white dark:bg-deep-space text-deep-space dark:text-papaya placeholder:text-deep-space/40 dark:placeholder:text-papaya/40 focus:outline-none focus:ring-2 focus:ring-steel/50"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-steel hover:text-steel/80 transition-colors"
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveToken}
                disabled={saving || !tokenInput.trim()}
                className="px-5 py-2.5 bg-flag-red hover:bg-flag-red/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
              >
                {saving ? 'Saving...' : 'Save Token'}
              </button>
            </div>

            {/* Remove Token */}
            {hasToken && (
              <div className="mt-6 pt-6 border-t border-steel/20">
                {confirmRemove ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-deep-space/70 dark:text-papaya/70">
                      Are you sure?
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveToken}
                      disabled={removing}
                      className="px-4 py-2 bg-molten hover:bg-molten/90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
                    >
                      {removing ? 'Removing...' : 'Yes, remove'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(false)}
                      className="px-4 py-2 border border-steel/30 text-deep-space dark:text-papaya rounded-lg hover:bg-steel/10 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                    className="px-4 py-2 bg-molten hover:bg-molten/90 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    Remove Token
                  </button>
                )}
              </div>
            )}

            {/* Feedback message */}
            {message && (
              <div
                className={`mt-4 px-4 py-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-molten dark:text-flag-red border border-red-200 dark:border-red-800'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>

        {/* Telegram Notifications Section */}
        <div className="mt-6 bg-white dark:bg-deep-space/50 rounded-xl border border-steel/20 shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-deep-space dark:text-papaya mb-2">
              Telegram Notifications
            </h2>
            <p className="text-sm text-deep-space/60 dark:text-papaya/60 mb-6">
              Receive price alerts via Telegram. Send{' '}
              <span className="font-mono text-xs bg-steel/10 dark:bg-steel/20 px-1.5 py-0.5 rounded">
                /start
              </span>{' '}
              to your bot in Telegram, copy the chat ID it replies with, and paste it below.
            </p>

            {/* Connection Status */}
            <div className="flex items-center gap-2 mb-6">
              {telegramLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-steel border-t-flag-red" />
                  <span className="text-sm text-deep-space/50 dark:text-papaya/50">
                    Checking connection...
                  </span>
                </div>
              ) : isConnected ? (
                <>
                  <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-deep-space dark:text-papaya">
                    Connected
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block h-3 w-3 rounded-full bg-gray-400" />
                  <span className="text-sm text-deep-space/60 dark:text-papaya/60">
                    Not connected
                  </span>
                </>
              )}
            </div>

            {/* Chat ID Form */}
            <div className="space-y-3">
              <label
                htmlFor="telegram-chat-id"
                className="block text-sm font-medium text-deep-space dark:text-papaya"
              >
                {isConnected ? 'Update chat ID' : 'Chat ID'}
              </label>
              <input
                id="telegram-chat-id"
                type="text"
                inputMode="numeric"
                value={telegramInput}
                onChange={(e) => setTelegramInput(e.target.value)}
                placeholder="Paste your Telegram chat ID"
                className="w-full px-4 py-2.5 rounded-lg border border-steel/30 bg-white dark:bg-deep-space text-deep-space dark:text-papaya placeholder:text-deep-space/40 dark:placeholder:text-papaya/40 focus:outline-none focus:ring-2 focus:ring-steel/50"
              />
              <button
                type="button"
                onClick={handleSaveTelegram}
                disabled={telegramSaving || !telegramInput.trim()}
                className="px-5 py-2.5 bg-flag-red hover:bg-flag-red/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
              >
                {telegramSaving ? 'Saving...' : 'Save & Test'}
              </button>
            </div>

            {/* Disconnect */}
            {isConnected && (
              <div className="mt-6 pt-6 border-t border-steel/20">
                {confirmTelegramRemove ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-deep-space/70 dark:text-papaya/70">
                      Are you sure?
                    </span>
                    <button
                      type="button"
                      onClick={handleDisconnectTelegram}
                      disabled={telegramRemoving}
                      className="px-4 py-2 bg-molten hover:bg-molten/90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
                    >
                      {telegramRemoving ? 'Disconnecting...' : 'Yes, disconnect'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmTelegramRemove(false)}
                      className="px-4 py-2 border border-steel/30 text-deep-space dark:text-papaya rounded-lg hover:bg-steel/10 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmTelegramRemove(true)}
                    className="px-4 py-2 bg-molten hover:bg-molten/90 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            )}

            {/* Telegram Feedback message */}
            {telegramMessage && (
              <div
                className={`mt-4 px-4 py-3 rounded-lg text-sm ${
                  telegramMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : telegramMessage.type === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-molten dark:text-flag-red border border-red-200 dark:border-red-800'
                }`}
              >
                {telegramMessage.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
