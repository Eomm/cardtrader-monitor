-- Migration: Wrap existing single-object notification_rule values in an array
-- This ensures all notification_rule values are arrays going forward,
-- supporting multiple rule types (threshold + stability).

UPDATE public.monitored_cards
SET notification_rule = jsonb_build_array(notification_rule)
WHERE notification_rule IS NOT NULL
  AND jsonb_typeof(notification_rule) = 'object';
