import { describe, expect, it } from "vitest";
import { pushStatusDescription } from "../src/notifications/push";

describe("manager push settings", () => {
  it("explains manager alerts after subscription is enabled", () => {
    expect(pushStatusDescription("enabled", true)).toContain("나에게 배정된 확정·변경 일정");
  });

  it("provides installed PWA guidance when push is unsupported", () => {
    expect(pushStatusDescription("unsupported", true)).toContain("홈 화면에 설치");
  });
});
