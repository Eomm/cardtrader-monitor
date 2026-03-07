/**
 * Shared Telegram Bot API helper for Deno Edge Functions.
 *
 * Re-implemented for the Deno runtime (cannot import from src/lib/).
 */

export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  parseMode: 'MarkdownV2' | 'HTML' = 'MarkdownV2',
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        link_preview_options: { is_disabled: true },
      }),
    });

    const data = await res.json();

    if (data.ok) {
      return { ok: true, messageId: String(data.result.message_id) };
    }

    return { ok: false, error: data.description ?? 'Unknown Telegram API error' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
