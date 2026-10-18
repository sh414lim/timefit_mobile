import type { Session, SupabaseClient } from "@supabase/supabase-js";

export const SESSION_HEALTHCHECK_INTERVAL_MS = 15 * 60 * 1000;
export const SESSION_REFRESH_WINDOW_SECONDS = 15 * 60;
export const SIGNED_OUT_RECOVERY_DELAY_MS = 1_500;

export function shouldRefreshSession(session: Session, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!session.expires_at) return false;
  return session.expires_at - nowSeconds <= SESSION_REFRESH_WINDOW_SECONDS;
}

export async function getDurableSession(client: SupabaseClient, nowMs = Date.now()): Promise<Session | null> {
  const current = await client.auth.getSession();
  if (current.error) throw current.error;
  const session = current.data.session;
  if (!session || !shouldRefreshSession(session, Math.floor(nowMs / 1000))) return session;

  const refreshed = await client.auth.refreshSession();
  if (!refreshed.error && refreshed.data.session) return refreshed.data.session;

  // A temporary network failure must not discard an access token that is still valid.
  if (session.expires_at && session.expires_at * 1000 > nowMs) return session;
  throw refreshed.error ?? new Error("SESSION_REFRESH_FAILED");
}
