import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { HAS_SUPABASE_CONFIG, SUPABASE_KEY, SUPABASE_URL } from '@/lib/config';

// Client-side Supabase client. Only the public anon key is ever used here.
// The service-role key must stay on a trusted server and is never shipped to
// the browser. If credentials are absent we return null and the app runs in
// the clearly separated local demo mode.
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!HAS_SUPABASE_CONFIG) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const supabase = getSupabaseClient();
export const supabaseConfigured = HAS_SUPABASE_CONFIG;
