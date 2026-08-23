import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL ? String(import.meta.env.VITE_SUPABASE_URL).trim() : '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ? String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim() : '';

export const isConfigured = Boolean(
  rawUrl && 
  rawUrl !== 'https://your-supabase-project.supabase.co' &&
  rawUrl !== 'https://placeholder.supabase.co' &&
  rawKey && 
  rawKey !== 'your-supabase-anon-key' &&
  rawKey !== 'placeholder-anon-key'
);

const supabaseUrl = isConfigured ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isConfigured ? rawKey : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
