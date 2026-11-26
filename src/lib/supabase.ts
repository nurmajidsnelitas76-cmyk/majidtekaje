import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedConfig: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  adminConfigured: boolean;
} | null = null;

export function getInitialEnvSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

export async function initSupabaseClient(): Promise<{
  client: SupabaseClient | null;
  adminConfigured: boolean;
  supabaseUrl: string;
}> {
  if (cachedClient && cachedConfig) {
    return {
      client: cachedClient,
      adminConfigured: cachedConfig.adminConfigured,
      supabaseUrl: cachedConfig.supabaseUrl,
    };
  }

  let { url, anonKey } = getInitialEnvSupabase();
  let adminConfigured = false;

  try {
    const res = await fetch('/api/public-config');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (!url && data.supabaseUrl) url = data.supabaseUrl;
      if (!anonKey && data.supabaseAnonKey) anonKey = data.supabaseAnonKey;
      adminConfigured = Boolean(data.adminConfigured);
    }
  } catch {
    // Ignore network error during fallback check
  }

  cachedConfig = {
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
    adminConfigured,
  };

  if (!url || !anonKey) {
    return {
      client: null,
      adminConfigured,
      supabaseUrl: url,
    };
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return {
    client: cachedClient,
    adminConfigured,
    supabaseUrl: url,
  };
}

export function getSupabaseClientSync(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const { url, anonKey } = getInitialEnvSupabase();
  if (url && anonKey) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  }
  return null;
}
