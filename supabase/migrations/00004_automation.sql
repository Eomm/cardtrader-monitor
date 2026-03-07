-- Migration: Cleanup automation
-- Adds a Postgres function to delete expired snapshots and notifications
-- based on each card's retention_days setting.

CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS TABLE(deleted_snapshots bigint, deleted_notifications bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snap_count bigint;
  notif_count bigint;
BEGIN
  DELETE FROM public.price_snapshots ps
  USING public.monitored_cards mc
  WHERE ps.monitored_card_id = mc.id
    AND ps.recorded_at < now() - (mc.retention_days || ' days')::interval;

  GET DIAGNOSTICS snap_count = ROW_COUNT;

  DELETE FROM public.notifications n
  USING public.monitored_cards mc
  WHERE n.monitored_card_id = mc.id
    AND n.sent_at < now() - (mc.retention_days || ' days')::interval;

  GET DIAGNOSTICS notif_count = ROW_COUNT;

  RETURN QUERY SELECT snap_count, notif_count;
END;
$$;
