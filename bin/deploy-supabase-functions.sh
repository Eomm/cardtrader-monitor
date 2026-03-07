echo "Deploying Supabase functions..."
supabase functions deploy import-wishlist --no-verify-jwt
supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy send-test-message --no-verify-jwt
echo "Done."

source ../.env
echo "Setting Telegram webhook..."
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=$VITE_SUPABASE_URL/functions/v1/telegram-webhook"
echo "Done."