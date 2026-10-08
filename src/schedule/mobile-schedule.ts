import type { SupabaseClient } from "@supabase/supabase-js";

export type ScheduleItem = {
  id: string;
  work_date: string;
  starts_at: string | null;
  ends_at: string | null;
  break_minutes: number;
  shift_name: string;
  is_day_off: boolean;
  updated_at: string;
  schedule_revision: number;
  acknowledged_revision: number;
  changed: boolean;
  previous: { starts_at: string | null; ends_at: string | null; shift_name: string | null; is_day_off: boolean } | null;
};

export type LeaveItem = {
  id: string;
  starts_on: string;
  ends_on: string;
  leave_type: string;
  amount: number;
  day_part: "full" | "am" | "pm";
};

export type MobileScheduleRange = {
  from: string;
  to: string;
  timezone: string;
  items: ScheduleItem[];
  leaves: LeaveItem[];
  serverTime: string;
};

type RpcEnvelope = {
  data?: { from?: string; to?: string; timezone?: string; items?: ScheduleItem[]; leaves?: LeaveItem[] };
  meta?: { server_time?: string };
};

export async function loadMobileScheduleRange(client: SupabaseClient, organizationId: string, from: string, to: string): Promise<MobileScheduleRange> {
  const { data, error } = await client.rpc("timefit_user_mobile_schedule_range", { p_organization_id: organizationId, p_from: from, p_to: to });
  if (error) throw error;
  const envelope = (data ?? {}) as RpcEnvelope;
  if (!envelope.data) throw new Error("INVALID_SCHEDULE_RESPONSE");
  return {
    from: envelope.data.from ?? from,
    to: envelope.data.to ?? to,
    timezone: envelope.data.timezone ?? "Asia/Seoul",
    items: envelope.data.items ?? [],
    leaves: envelope.data.leaves ?? [],
    serverTime: envelope.meta?.server_time ?? new Date().toISOString()
  };
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(key: string): string {
  const date = new Date(`${key}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  return addDays(key, -offset);
}

export function monthRange(key: string): { from: string; to: string } {
  const [year, month] = key.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const last = new Date(Date.UTC(year, month, 0, 12));
  return { from: startOfWeek(first.toISOString().slice(0, 10)), to: addDays(startOfWeek(last.toISOString().slice(0, 10)), 6) };
}

export function leaveCovers(leave: LeaveItem, date: string): boolean {
  return leave.starts_on <= date && date <= leave.ends_on;
}

export function scheduleMinutes(item: ScheduleItem): number | null {
  if (item.is_day_off || !item.starts_at || !item.ends_at) return null;
  const [startHour, startMinute] = item.starts_at.split(":").map(Number);
  const [endHour, endMinute] = item.ends_at.split(":").map(Number);
  return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute - item.break_minutes);
}

export function leaveConflictsWithSchedule(leave: LeaveItem, item: ScheduleItem): boolean {
  if (item.is_day_off || !item.starts_at || !item.ends_at || !leaveCovers(leave, item.work_date)) return false;
  if (leave.day_part === "full") return true;
  const start = Number(item.starts_at.slice(0, 2)) * 60 + Number(item.starts_at.slice(3, 5));
  const end = Number(item.ends_at.slice(0, 2)) * 60 + Number(item.ends_at.slice(3, 5));
  return leave.day_part === "am" ? start < 13 * 60 : end > 13 * 60;
}

export async function acknowledgeSchedule(client: SupabaseClient, scheduleId: string, revision: number): Promise<void> {
  const { error } = await client.rpc("timefit_user_mobile_acknowledge_schedule", { p_schedule_id: scheduleId, p_revision: revision });
  if (error) throw error;
}

export function cacheKey(userId: string, organizationId: string, from: string, to: string): string {
  return `timefit:schedule:v1:${userId}:${organizationId}:${from}:${to}`;
}

export function scheduleTargetFromHash(hash: string): { date: string; id: string | null } | null {
  const query = hash.split("?")[1];
  if (!query) return null;
  const params = new URLSearchParams(query);
  const date = params.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { date, id: params.get("id") };
}
