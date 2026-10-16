import type { SupabaseClient } from "@supabase/supabase-js";

export type ManagerScheduleStaff = { id:string;name:string;category_id:string|null;category_name:string|null;job_title:string|null };
export type ManagerScheduleItem = {
  id:string;staff_id:string;work_date:string;starts_at:string|null;ends_at:string|null;break_minutes:number;
  shift_name:string;is_day_off:boolean;status:string;approval_status:string;schedule_revision:number;manager_note:string|null;updated_at:string;
};
export type ManagerScheduleLeave = { id:string;staff_id:string;starts_on:string;ends_on:string;leave_type:string;day_part:"full"|"am"|"pm" };
export type ManagerScheduleRange = { from:string;to:string;timezone:string;staff:ManagerScheduleStaff[];items:ManagerScheduleItem[];leaves:ManagerScheduleLeave[];serverTime:string };
export type ManagerScheduleDraft = {
  id:string|null;staffId:string;workDate:string;startsAt:string;endsAt:string;breakMinutes:number;shiftName:string;isDayOff:boolean;
  managerNote:string;expectedRevision:number|null;
};
export type ManagerScheduleWriteResult = { schedule:ManagerScheduleItem;notification_status:"queued"|"awaiting_approval"|"unavailable"|"unchanged";duplicate:boolean };

type RangeEnvelope = { data?:Partial<Omit<ManagerScheduleRange,"serverTime">>;meta?:{server_time?:string} };

export async function loadManagerScheduleRange(client:SupabaseClient,organizationId:string,from:string,to:string):Promise<ManagerScheduleRange>{
  const {data,error}=await client.rpc("timefit_user_mobile_manager_schedule_range",{p_organization_id:organizationId,p_from:from,p_to:to});
  if(error)throw error;
  const envelope=(data??{}) as RangeEnvelope;
  if(!envelope.data)throw new Error("INVALID_MANAGER_SCHEDULE_RESPONSE");
  return {from:envelope.data.from??from,to:envelope.data.to??to,timezone:envelope.data.timezone??"Asia/Seoul",staff:envelope.data.staff??[],items:envelope.data.items??[],leaves:envelope.data.leaves??[],serverTime:envelope.meta?.server_time??new Date().toISOString()};
}

export async function saveManagerSchedule(client:SupabaseClient,organizationId:string,draft:ManagerScheduleDraft,requestKey:string):Promise<ManagerScheduleWriteResult>{
  const {data,error}=await client.rpc("timefit_user_mobile_manager_save_schedule",{
    p_organization_id:organizationId,p_schedule_id:draft.id,p_staff_id:draft.staffId,p_work_date:draft.workDate,
    p_starts_at:draft.isDayOff?null:draft.startsAt,p_ends_at:draft.isDayOff?null:draft.endsAt,
    p_break_minutes:draft.isDayOff?0:draft.breakMinutes,p_shift_name:draft.shiftName,p_is_day_off:draft.isDayOff,
    p_manager_note:draft.managerNote,p_expected_revision:draft.expectedRevision,p_request_key:requestKey
  });
  if(error)throw error;
  return data as ManagerScheduleWriteResult;
}

export async function cancelManagerSchedule(client:SupabaseClient,organizationId:string,item:ManagerScheduleItem,requestKey:string):Promise<ManagerScheduleWriteResult>{
  const {data,error}=await client.rpc("timefit_user_mobile_manager_cancel_schedule",{p_organization_id:organizationId,p_schedule_id:item.id,p_expected_revision:item.schedule_revision,p_request_key:requestKey});
  if(error)throw error;
  return data as ManagerScheduleWriteResult;
}

const clockMinutes=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3,5));
const dayMinutes=(date:string)=>Date.parse(`${date}T00:00:00Z`)/60000;
function absoluteRange(date:string,start:string,end:string){const starts=dayMinutes(date)+clockMinutes(start);let ends=dayMinutes(date)+clockMinutes(end);if(ends<=starts)ends+=1440;return {starts,ends};}
function dateCovered(leave:ManagerScheduleLeave,date:string){return leave.starts_on<=date&&date<=leave.ends_on;}

export function validateManagerScheduleDraft(draft:ManagerScheduleDraft,items:ManagerScheduleItem[],leaves:ManagerScheduleLeave[]):string|null{
  if(!draft.staffId||!/^\d{4}-\d{2}-\d{2}$/.test(draft.workDate))return "직원과 근무 날짜를 확인해 주세요.";
  if(draft.shiftName.trim().length>80||draft.managerNote.length>500)return "근무명 또는 관리자 메모가 너무 길어요.";
  if(draft.isDayOff)return items.some(item=>item.staff_id===draft.staffId&&item.id!==draft.id&&item.status!=="cancelled"&&item.work_date===draft.workDate)?"이미 등록된 근무 일정이 있어 휴무를 추가할 수 없어요.":null;
  if(!/^\d{2}:\d{2}$/.test(draft.startsAt)||!/^\d{2}:\d{2}$/.test(draft.endsAt)||draft.startsAt===draft.endsAt)return "출근과 퇴근 시간을 확인해 주세요.";
  const range=absoluteRange(draft.workDate,draft.startsAt,draft.endsAt);
  const duration=range.ends-range.starts;
  if(!Number.isInteger(draft.breakMinutes)||draft.breakMinutes<0||draft.breakMinutes>480||draft.breakMinutes>=duration)return "휴게시간은 근무시간보다 짧게 입력해 주세요.";
  const nextDate=new Date((dayMinutes(draft.workDate)+1440)*60000).toISOString().slice(0,10);
  const overnight=clockMinutes(draft.endsAt)<clockMinutes(draft.startsAt);
  const leaveConflict=leaves.some((leave)=>leave.staff_id===draft.staffId&&(
    (dateCovered(leave,draft.workDate)&&(leave.day_part==="full"||(leave.day_part==="am"&&clockMinutes(draft.startsAt)<780)||(leave.day_part==="pm"&&(clockMinutes(draft.endsAt)>780||overnight))))||
    (overnight&&dateCovered(leave,nextDate)&&(leave.day_part==="full"||leave.day_part==="am"))
  ));
  if(leaveConflict)return "승인된 휴가와 시간이 겹쳐요.";
  const scheduleConflict=items.some((item)=>item.staff_id===draft.staffId&&item.id!==draft.id&&item.status!=="cancelled"&&(
    item.is_day_off?item.work_date===draft.workDate:Boolean(item.starts_at&&item.ends_at&&(()=>{const existing=absoluteRange(item.work_date,item.starts_at!,item.ends_at!);return range.starts<existing.ends&&existing.starts<range.ends;})())
  ));
  return scheduleConflict?"이미 등록된 근무 일정과 시간이 겹쳐요.":null;
}

export function managerScheduleCacheKey(userId:string,organizationId:string,from:string,to:string){return `timefit:manager-schedule:v1:${userId}:${organizationId}:${from}:${to}`;}
export function notificationStatusLabel(status:ManagerScheduleWriteResult["notification_status"]){
  return status==="queued"?"직원 알림 전송을 예약했어요.":status==="awaiting_approval"?"승인 완료 후 직원에게 알림이 전송돼요.":status==="unavailable"?"직원 앱 계정이 연결되지 않아 알림은 보내지 못했어요.":"일정은 저장됐고 추가 알림은 없어요.";
}
