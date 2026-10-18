import { describe, expect, it, vi } from "vitest";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getDurableSession, SESSION_REFRESH_WINDOW_SECONDS, shouldRefreshSession } from "../src/auth/session-lifecycle";

function session(expiresAt?: number): Session {
  return { access_token: "access", refresh_token: "refresh", token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user: { id: "user-1" } } as Session;
}

function clientWith(current: Session | null, refreshed: Session | null = current, refreshError: Error | null = null) {
  const getSession = vi.fn().mockResolvedValue({ data: { session: current }, error: null });
  const refreshSession = vi.fn().mockResolvedValue({ data: { session: refreshed }, error: refreshError });
  return { client: { auth: { getSession, refreshSession } } as unknown as SupabaseClient, getSession, refreshSession };
}

describe("durable mobile sessions", () => {
  it("refreshes a persisted session before its access token expires", async () => {
    const now = 2_000_000_000;
    const current = session(now + SESSION_REFRESH_WINDOW_SECONDS - 1);
    const refreshed = session(now + 3600);
    const mock = clientWith(current, refreshed);
    await expect(getDurableSession(mock.client, now * 1000)).resolves.toBe(refreshed);
    expect(mock.refreshSession).toHaveBeenCalledOnce();
  });

  it("does not rotate a healthy token unnecessarily", async () => {
    const now = 2_000_000_000;
    const current = session(now + SESSION_REFRESH_WINDOW_SECONDS + 60);
    const mock = clientWith(current);
    await expect(getDurableSession(mock.client, now * 1000)).resolves.toBe(current);
    expect(mock.refreshSession).not.toHaveBeenCalled();
  });

  it("keeps a still-valid token during a temporary refresh failure", async () => {
    const now = 2_000_000_000;
    const current = session(now + 30);
    const mock = clientWith(current, null, new Error("offline"));
    await expect(getDurableSession(mock.client, now * 1000)).resolves.toBe(current);
  });

  it("rejects an expired token when it cannot be refreshed", async () => {
    const now = 2_000_000_000;
    const mock = clientWith(session(now - 1), null, new Error("revoked"));
    await expect(getDurableSession(mock.client, now * 1000)).rejects.toThrow("revoked");
  });

  it("treats sessions without expiry metadata as durable", () => {
    expect(shouldRefreshSession(session())).toBe(false);
  });
});
