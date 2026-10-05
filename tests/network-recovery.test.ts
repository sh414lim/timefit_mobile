import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConnectivitySnapshot, reportNetworkFailure, reportNetworkSuccess, resetConnectivityForTest, setBrowserConnectivity } from "../src/network/connectivity";
import { RequestTimeoutError, classifyRequestFailure, isAmbiguousWriteFailure, scopedCacheKey, withRequestTimeout } from "../src/network/request-policy";

describe("MOB-09 network recovery", () => {
  beforeEach(() => resetConnectivityForTest());
  it("tracks offline, recovering and successful server contact", () => {
    reportNetworkFailure("offline"); expect(getConnectivitySnapshot().status).toBe("offline");
    setBrowserConnectivity(true); expect(getConnectivitySnapshot().status).toBe("recovering");
    reportNetworkSuccess("2026-10-05T06:00:00Z"); expect(getConnectivitySnapshot()).toEqual({ status:"online", lastSuccessfulAt:"2026-10-05T06:00:00Z" });
  });
  it("classifies ambiguous transport failures separately from policy failures", () => {
    expect(classifyRequestFailure(new Error("Failed to fetch"))).toBe("transport");
    expect(classifyRequestFailure(new Error("authentication_required"))).toBe("auth");
    expect(classifyRequestFailure(new Error("invalid_or_expired_qr"))).toBe("validation");
    expect(isAmbiguousWriteFailure("timeout")).toBe(true);
    expect(isAmbiguousWriteFailure("validation")).toBe(false);
  });
  it("times out stalled requests without treating them as confirmed", async () => {
    vi.useFakeTimers(); const pending = withRequestTimeout(new Promise<string>(()=>{}), 1000); const assertion=expect(pending).rejects.toBeInstanceOf(RequestTimeoutError); await vi.advanceTimersByTimeAsync(1000); await assertion; vi.useRealTimers();
  });
  it("isolates cache keys by user, organization and role", () => {
    expect(scopedCacheKey("schedule",1,"user-a","org-a","employee")).not.toBe(scopedCacheKey("schedule",1,"user-a","org-b","employee"));
    expect(scopedCacheKey("schedule",1,"user-a","org-a","employee")).not.toBe(scopedCacheKey("schedule",1,"user-a","org-a","owner"));
  });
});
