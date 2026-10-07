import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function hasSupabaseConfig(url?: string, key?: string): boolean {
  if (!url || !key) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && key.length >= 16;
  } catch {
    return false;
  }
}

export function getSupabaseBrowserClient(url?: string, key?: string): SupabaseClient {
  if (browserClient) return browserClient;
  if (!hasSupabaseConfig(url, key) || !url || !key) throw new Error("SUPABASE_CONFIG_MISSING");
  browserClient = createClient(url, key, {
    auth: { autoRefreshToken: true, detectSessionInUrl: true, persistSession: true }
  });
  return browserClient;
}
