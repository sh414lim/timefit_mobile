import type { SupabaseClient } from "@supabase/supabase-js";
import { canAccessSection, type MobileRoleContext } from "../authorization/mobile-context";
import { loadManagerAttendance, type AttendanceDashboard } from "../attendance/manager-attendance";
import { loadApprovalInbox, type ApprovalInbox } from "../approvals/mobile-approvals";

export type StaffingShortage = {
  category_id: string;
  category_name: string;
  required_count: number;
  scheduled_count: number;
};

export type StaffingDay = {
  date: string;
  scheduled_count: number;
  required_count: number;
  shortages: StaffingShortage[];
};

export type ManagerStaffingSummary = {
  timezone: string;
  configured: boolean;
  days: StaffingDay[];
  serverTime: string;
};

export type ManagerHomeSection = "attendance" | "approvals" | "staffing";
export type ManagerHomeSummary = {
  attendance: AttendanceDashboard | null;
  approvals: ApprovalInbox | null;
  staffing: ManagerStaffingSummary | null;
  failures: ManagerHomeSection[];
  serverTime: string | null;
};

export function managerHomeCacheKey(context: MobileRoleContext) {
  return `timefit:manager-home:v1:${context.id}`;
}

export function managerToday(timeZone = "Asia/Seoul") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function mergeManagerHome(previous: ManagerHomeSummary | null, next: ManagerHomeSummary): ManagerHomeSummary {
  if (!previous) return next;
  return {
    attendance: next.attendance ?? previous.attendance,
    approvals: next.approvals ?? previous.approvals,
    staffing: next.staffing ?? previous.staffing,
    failures: next.failures,
    serverTime: next.serverTime ?? previous.serverTime
  };
}

export async function loadManagerStaffingSummary(client: SupabaseClient, organizationId: string): Promise<ManagerStaffingSummary> {
  const { data, error } = await client.rpc("timefit_user_mobile_manager_staffing_summary", { p_organization_id: organizationId });
  if (error) throw error;
  return { ...(data.data as Omit<ManagerStaffingSummary, "serverTime">), serverTime: data.meta.server_time };
}

export async function loadManagerHome(client: SupabaseClient, context: MobileRoleContext, workDate = managerToday()): Promise<ManagerHomeSummary> {
  const requests: Array<{ section: ManagerHomeSection; load: () => Promise<AttendanceDashboard | ApprovalInbox | ManagerStaffingSummary> }> = [];
  if (canAccessSection(context, "attendance")) requests.push({ section: "attendance", load: () => loadManagerAttendance(client, context.organizationId, workDate) });
  if (canAccessSection(context, "approvals")) requests.push({ section: "approvals", load: () => loadApprovalInbox(client, context.organizationId) });
  if (canAccessSection(context, "schedule")) requests.push({ section: "staffing", load: () => loadManagerStaffingSummary(client, context.organizationId) });

  const results = await Promise.allSettled(requests.map((request) => request.load()));
  const summary: ManagerHomeSummary = { attendance: null, approvals: null, staffing: null, failures: [], serverTime: null };
  results.forEach((result, index) => {
    const section = requests[index].section;
    if (result.status === "rejected") { summary.failures.push(section); return; }
    if (section === "attendance") summary.attendance = result.value as AttendanceDashboard;
    if (section === "approvals") summary.approvals = result.value as ApprovalInbox;
    if (section === "staffing") summary.staffing = result.value as ManagerStaffingSummary;
  });
  const serverTimes = [summary.attendance?.serverTime, summary.approvals?.serverTime, summary.staffing?.serverTime].filter((value): value is string => Boolean(value));
  summary.serverTime = serverTimes.sort().at(-1) ?? null;
  return summary;
}
