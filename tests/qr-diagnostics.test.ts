import { describe, expect, it } from "vitest";
import { createQrDiagnosticEvent, qrDiagnosticsEnabled, safeQrDiagnosticDetail } from "../src/attendance/qr-diagnostics";

describe("Android QR diagnostics", () => {
  it("enables diagnostics only through the explicit query flag", () => {
    expect(qrDiagnosticsEnabled("?qrdebug=1")).toBe(true);
    expect(qrDiagnosticsEnabled("?qrdebug=0")).toBe(false);
    expect(qrDiagnosticsEnabled("?qr=secret")).toBe(false);
  });

  it("redacts QR tokens and request keys from diagnostic details", () => {
    expect(safeQrDiagnosticDetail("token=secret-value request_key=request-secret")).toBe("token=[redacted] request_key=[redacted]");
  });

  it("creates a labeled event without persistent identity data", () => {
    const event = createQrDiagnosticEvent("rpc_started", "token_length=120", new Date("2026-10-09T00:00:00Z"));
    expect(event).toEqual({ stage: "rpc_started", label: "서버 전송 시작", detail: "token_length=120", occurredAt: "2026-10-09T00:00:00.000Z" });
  });
});
