import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Service-role client: bypasses Row Level Security. SERVER ONLY.
// This is the workhorse for all data access — the API is the authorization layer.
export const db = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anon client: used only for auth flows that must run as the end user
// (signInWithPassword, refreshSession). It cannot bypass RLS.
export const authClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
