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
};

export type LeaveItem = {
  id: string;
  starts_on: string;
  ends_on: string;
  leave_type: string;
  amount: number;
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

export function cacheKey(userId: string, organizationId: string, from: string, to: string): string {
  return `timefit:schedule:v1:${userId}:${organizationId}:${from}:${to}`;
}
