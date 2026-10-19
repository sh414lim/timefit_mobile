import { describe, expect, it, vi } from "vitest";
import { loadManagerHome, managerHomeCacheKey, mergeManagerHome } from "../src/dashboard/manager-home";
import type { MobileRoleContext } from "../src/authorization/mobile-context";

const manager: MobileRoleContext = {
  id: "org:sub_manager", organizationId: "org", organizationName: "버터빌라", role: "sub_manager", staffId: "staff",
  permissions: ["attendance.view", "schedule.view", "leave.review"]
};

describe("manager home data", () => {
  it("loads only authorized real-data sections and keeps a scoped cache key", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "timefit_user_mobile_manager_attendance") return { data: { data: { timezone: "Asia/Seoul", workDate: "2026-10-15", counts: { working: 2, completed: 1, missing: 1, scheduled: 3 }, rows: [] }, meta: { server_time: "2026-10-15T01:00:00Z" } }, error: null };
      if (name === "timefit_user_mobile_approval_inbox") return { data: { data: { timezone: "Asia/Seoul", counts: { pending: 2, approved: 0, rejected: 0 }, items: [] }, meta: { server_time: "2026-10-15T01:01:00Z" } }, error: null };
      return { data: { data: { timezone: "Asia/Seoul", configured: true, days: [] }, meta: { server_time: "2026-10-15T01:02:00Z" } }, error: null };
    });
    const result = await loadManagerHome({ rpc } as never, manager, "2026-10-15");
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(result.attendance?.counts.missing).toBe(1);
    expect(result.approvals?.counts.pending).toBe(2);
    expect(result.staffing?.configured).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.serverTime).toBe("2026-10-15T01:02:00Z");
    expect(managerHomeCacheKey(manager)).toContain("org:sub_manager");
  });

  it("returns successful sections when another summary request fails", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "timefit_user_mobile_manager_attendance") return { data: { data: { timezone: "Asia/Seoul", workDate: "2026-10-15", counts: { working: 1, completed: 0, missing: 0, scheduled: 0 }, rows: [] }, meta: { server_time: "2026-10-15T01:00:00Z" } }, error: null };
      if (name === "timefit_user_mobile_approval_inbox") return { data: null, error: new Error("approval unavailable") };
      return { data: { data: { timezone: "Asia/Seoul", configured: false, days: [] }, meta: { server_time: "2026-10-15T01:02:00Z" } }, error: null };
    });
    const result = await loadManagerHome({ rpc } as never, manager, "2026-10-15");
    expect(result.attendance?.counts.working).toBe(1);
    expect(result.approvals).toBeNull();
    expect(result.staffing?.configured).toBe(false);
    expect(result.failures).toEqual(["approvals"]);
  });

  it("keeps the last successful section when a partial refresh fails", () => {
    const previous = { attendance: null, approvals: { timezone: "Asia/Seoul", counts: { pending: 4, approved: 0, rejected: 0 }, items: [], serverTime: "2026-10-15T01:00:00Z" }, staffing: null, failures: [], serverTime: "2026-10-15T01:00:00Z" };
    const next = { attendance: null, approvals: null, staffing: null, failures: ["approvals" as const], serverTime: null };
    expect(mergeManagerHome(previous, next).approvals?.counts.pending).toBe(4);
    expect(mergeManagerHome(previous, next).failures).toEqual(["approvals"]);
  });

  it("does not request sections outside delegated permissions", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { data: { timezone: "Asia/Seoul", counts: { working: 0, completed: 0, missing: 0, scheduled: 0 }, rows: [] }, meta: { server_time: "2026-10-15T01:00:00Z" } }, error: null });
    const attendanceOnly = { ...manager, permissions: ["attendance.view"] };
    const result = await loadManagerHome({ rpc } as never, attendanceOnly, "2026-10-15");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("timefit_user_mobile_manager_attendance", { p_organization_id: "org", p_work_date: "2026-10-15" });
    expect(result.approvals).toBeNull();
    expect(result.staffing).toBeNull();
  });
});
