import type { SupabaseClient } from "@supabase/supabase-js";

export type AttendanceStatus = "working" | "completed" | "missing" | "scheduled";
export type AttendanceRow = { id:string; staff_id:string; staff_name:string; category_name:string|null; job_title:string|null; work_date:string; scheduled_start:string|null; scheduled_end:string|null; checked_in_at:string|null; checked_out_at:string|null; source:string|null; status:AttendanceStatus; late:boolean };
export type AttendanceDashboard = { timezone:string; workDate:string; counts:Record<AttendanceStatus,number>; rows:AttendanceRow[]; serverTime:string };

export function attendanceCacheKey(userId:string,organizationId:string,date:string){return `timefit:manager-attendance:v1:${userId}:${organizationId}:${date}`;}
export async function loadManagerAttendance(client:SupabaseClient,organizationId:string,workDate:string):Promise<AttendanceDashboard>{
  const {data,error}=await client.rpc("timefit_user_mobile_manager_attendance",{p_organization_id:organizationId,p_work_date:workDate});
  if(error)throw error;
  return {...data.data,serverTime:data.meta.server_time} as AttendanceDashboard;
}
export function formatClock(value:string|null,timeZone:string){return value?new Intl.DateTimeFormat("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone}).format(new Date(value)):"—";}
