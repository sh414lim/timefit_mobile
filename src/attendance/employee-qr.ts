import type {SupabaseClient} from "@supabase/supabase-js";
export type TodayAttendance={workDate:string;timezone:string;checkedInAt:string|null;checkedOutAt:string|null;nextAction:"check_in"|"check_out"|"completed"};
export async function loadTodayAttendance(client:SupabaseClient,organizationId:string){const {data,error}=await client.rpc("timefit_user_mobile_attendance_today",{p_organization_id:organizationId});if(error)throw error;return data as TodayAttendance;}
export async function recordQrAttendance(client:SupabaseClient,token:string,action:"check_in"|"check_out"){const {data,error}=await client.rpc("timefit_user_mobile_qr_attendance",{p_token:token,p_action:action});if(error)throw error;return data as TodayAttendance;}
export function qrTokenFromUrl(value:string){try{const url=new URL(value,typeof window==="undefined"?"https://timefit-mobile.vercel.app":window.location.origin);return url.searchParams.get("qr")??value.trim();}catch{return value.trim();}}
