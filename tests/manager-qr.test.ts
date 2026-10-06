import { describe, expect, it, vi } from "vitest";
import { attendanceQrUrl, rotateAttendanceQr, startAttendanceQr, stopAttendanceQr } from "../src/attendance/manager-qr";

describe("manager attendance QR", () => {
  it("builds a mobile attendance deep link without exposing the organization id", () => {
    const url = new URL(attendanceQrUrl("secret-token", "https://timefit-mobile.vercel.app"));
    expect(url.searchParams.get("qr")).toBe("secret-token");
    expect(url.hash).toBe("#attendance");
    expect(url.searchParams.has("organizationId")).toBe(false);
  });

  it("starts, rotates, and stops the server-side display session", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { sessionId: "session-1", token: "first" }, error: null })
      .mockResolvedValueOnce({ data: { sessionId: "session-1", token: "second" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const client = { rpc } as never;
    await startAttendanceQr(client, "buttervilla");
    await rotateAttendanceQr(client, "session-1");
    await stopAttendanceQr(client, "session-1");
    expect(rpc).toHaveBeenNthCalledWith(1, "timefit_user_start_attendance_qr", { p_organization_id: "buttervilla" });
    expect(rpc).toHaveBeenNthCalledWith(2, "timefit_user_rotate_attendance_qr", { p_session_id: "session-1" });
    expect(rpc).toHaveBeenNthCalledWith(3, "timefit_user_stop_attendance_qr", { p_session_id: "session-1" });
  });
});
