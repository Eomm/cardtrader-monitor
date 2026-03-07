import { sendTelegramMessage } from '../_shared/telegram.ts';

// ---------------------------------------------------------------------------
// Telegram Bot Webhook Handler
// ---------------------------------------------------------------------------
// Public endpoint (no JWT verification). Telegram calls this when users
// message the bot. Only handles /start command.
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // Only accept POST requests (Telegram sends POST for webhook updates)
  if (req.method !== 'POST') {
    return new Response('ok', { status: 200 });
  }

  try {
    const update = await req.json();
    const messageText: string = update?.message?.text ?? '';
    const chatId: number | undefined = update?.message?.chat?.id;

    if (!chatId) {
      // No chat ID in update -- nothing to reply to
      return new Response('ok', { status: 200 });
    }

    if (messageText.startsWith('/start')) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';

      // MarkdownV2 requires escaping special characters in non-code text
      const replyText = [
        `Your chat ID is: \`${chatId}\``,
        '',
        'Copy this number and paste it in the CardTrader Monitor settings page to connect notifications\\.',
      ].join('\n');

      await sendTelegramMessage(botToken, chatId, replyText, 'MarkdownV2');
    }

    // Always return 200 to Telegram to prevent retries
    return new Response('ok', { status: 200 });
  } catch {
    // Always return 200 to Telegram even on errors
    return new Response('ok', { status: 200 });
  }
});
