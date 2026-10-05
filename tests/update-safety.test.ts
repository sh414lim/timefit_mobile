import { afterEach, describe, expect, it } from "vitest";
import { getUpdateSafetySnapshot, setUpdateBlocker } from "../src/pwa/update-safety";

describe("PWA update safety", () => {
  afterEach(() => { setUpdateBlocker("attendance", "", false); setUpdateBlocker("leave", "", false); });
  it("blocks activation while a write or recovery is pending", () => {
    expect(getUpdateSafetySnapshot().safe).toBe(true);
    setUpdateBlocker("attendance", "출퇴근 기록 처리 중", true);
    setUpdateBlocker("leave", "휴가 신청 복구 중", true);
    expect(getUpdateSafetySnapshot()).toEqual({ safe: false, reasons: ["출퇴근 기록 처리 중", "휴가 신청 복구 중"] });
    setUpdateBlocker("attendance", "", false);
    setUpdateBlocker("leave", "", false);
    expect(getUpdateSafetySnapshot().safe).toBe(true);
  });
});
