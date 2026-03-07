import { createClient } from '@supabase/supabase-js';

export async function main(): Promise<void> {
  const startTime = Date.now();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
  });

  const { data, error } = await supabase.rpc('cleanup_expired_data');

  if (error) {
    console.error('Cleanup failed:', error.message);
    process.exit(1);
  }

  const result = Array.isArray(data) ? data[0] : data;
  const deletedSnapshots = result?.deleted_snapshots ?? 0;
  const deletedNotifications = result?.deleted_notifications ?? 0;

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `Deleted ${deletedSnapshots} snapshots and ${deletedNotifications} notifications older than retention (${elapsed}s)`,
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
