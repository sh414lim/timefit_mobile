import type { SupabaseClient } from "@supabase/supabase-js";

export type AttendanceQrPayload = {
  sessionId: string;
  organizationId: string;
  organizationName: string;
  token: string;
  issuedAt: string;
  expiresAt: string;
  rotateAfterSeconds: number;
};

export async function startAttendanceQr(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client.rpc("timefit_user_start_attendance_qr", { p_organization_id: organizationId });
  if (error) throw error;
  return data as AttendanceQrPayload;
}

export async function rotateAttendanceQr(client: SupabaseClient, sessionId: string) {
  const { data, error } = await client.rpc("timefit_user_rotate_attendance_qr", { p_session_id: sessionId });
  if (error) throw error;
  return data as AttendanceQrPayload;
}

export async function stopAttendanceQr(client: SupabaseClient, sessionId: string) {
  const { error } = await client.rpc("timefit_user_stop_attendance_qr", { p_session_id: sessionId });
  if (error) throw error;
}

export function attendanceQrUrl(token: string, origin = "https://timefit-mobile.vercel.app") {
  const url = new URL(origin);
  url.searchParams.set("qr", token);
  url.hash = "attendance";
  return url.toString();
}
