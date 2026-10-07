import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveDayPart = "full" | "am" | "pm";
export type LeaveRequest = { id:string; starts_on:string; ends_on:string; leave_type:string; day_part:LeaveDayPart; amount:number; reason:string|null; status:LeaveStatus; review_comment:string|null; created_at:string; updated_at:string };
export type LeaveSummary = { timezone:string; granted:number; approved:number; pending:number; remaining:number; available:number; requests:LeaveRequest[]; serverTime:string };
type SummaryEnvelope = { data?: Omit<LeaveSummary,"serverTime">; meta?: { server_time?:string } };

export const leaveStatusLabel: Record<LeaveStatus,string> = { pending:"승인 대기",approved:"승인",rejected:"반려",cancelled:"취소" };
export const dayPartLabel: Record<LeaveDayPart,string> = { full:"연차",am:"오전 반차",pm:"오후 반차" };

export function validateLeaveDraft(startsOn:string,endsOn:string,dayPart:LeaveDayPart,reason:string,today:string):string|null {
  if (!startsOn||!endsOn) return "휴가 날짜를 선택해 주세요.";
  if (startsOn<today) return "오늘 이전 날짜는 신청할 수 없어요.";
  if (endsOn<startsOn) return "종료일은 시작일보다 빠를 수 없어요.";
  if (dayPart!=="full"&&startsOn!==endsOn) return "반차는 하루만 선택할 수 있어요.";
  if (reason.length>500) return "사유는 500자 이내로 입력해 주세요.";
  return null;
}

export function leaveCacheKey(userId:string,organizationId:string){ return `timefit:leave:v1:${userId}:${organizationId}`; }
export function leaveDraftKey(userId:string,organizationId:string){ return `timefit:leave-draft:v1:${userId}:${organizationId}:employee`; }

export async function loadLeaveSummary(client:SupabaseClient,organizationId:string):Promise<LeaveSummary>{
  const {data,error}=await client.rpc("timefit_user_mobile_leave_summary",{p_organization_id:organizationId});
  if(error) throw error; const envelope=(data??{}) as SummaryEnvelope; if(!envelope.data) throw new Error("INVALID_LEAVE_RESPONSE");
  return {...envelope.data,serverTime:envelope.meta?.server_time??new Date().toISOString()};
}

export async function submitLeave(client:SupabaseClient,organizationId:string,draft:{startsOn:string;endsOn:string;dayPart:LeaveDayPart;reason:string;requestKey:string}){
  const {data,error}=await client.rpc("timefit_user_mobile_submit_leave",{p_organization_id:organizationId,p_starts_on:draft.startsOn,p_ends_on:draft.endsOn,p_day_part:draft.dayPart,p_reason:draft.reason||null,p_request_key:draft.requestKey});
  if(error) throw error; return data as {request:LeaveRequest;schedule_conflicts:number;duplicate:boolean};
}

export async function cancelLeave(client:SupabaseClient,organizationId:string,requestId:string,requestKey:string){
  const {data,error}=await client.rpc("timefit_user_mobile_cancel_leave",{p_organization_id:organizationId,p_request_id:requestId,p_request_key:requestKey}); if(error) throw error; return data as LeaveRequest;
}
