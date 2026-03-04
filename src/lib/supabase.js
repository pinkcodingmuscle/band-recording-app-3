import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isPlaceholder =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('your-project') ||
  supabaseAnonKey === 'your-anon-key';

/**
 * Supabase client — null when env vars are not configured.
 * All features gracefully fall back to localStorage/IndexedDB/in-memory
 * when this is null.
 */
export const supabase = isPlaceholder
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = !isPlaceholder;
