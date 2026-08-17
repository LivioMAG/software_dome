import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '../config/loadConfig.js';

let client;

export async function initializeSupabase() {
  if (client) return client;
  const config = await loadConfig();
  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export function getSupabase() {
  if (!client) throw new Error('Supabase wurde noch nicht initialisiert.');
  return client;
}
