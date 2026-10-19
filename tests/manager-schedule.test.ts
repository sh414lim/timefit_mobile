import {describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {loadManagerScheduleRange,managerScheduleCacheKey,notificationStatusLabel,saveManagerSchedule,validateManagerScheduleDraft,type ManagerScheduleDraft,type ManagerScheduleItem} from "../src/schedule/manager-schedule";

const draft:ManagerScheduleDraft={id:null,staffId:"staff-1",workDate:"2026-10-15",startsAt:"22:00",endsAt:"06:00",breakMinutes:60,shiftName:"야간",isDayOff:false,managerNote:"인수인계",expectedRevision:null};
const item=(overrides:Partial<ManagerScheduleItem>={}):ManagerScheduleItem=>({id:"s-1",staff_id:"staff-1",work_date:"2026-10-15",starts_at:"09:00:00",ends_at:"18:00:00",break_minutes:60,shift_name:"주간",is_day_off:false,status:"published",approval_status:"approved",schedule_revision:1,manager_note:null,updated_at:"2026-10-15T00:00:00Z",...overrides});
const component=readFileSync(new URL("../src/components/manager-schedule.tsx",import.meta.url),"utf8");

describe("manager mobile schedule",()=>{
  it("loads only through the scoped manager range RPC",async()=>{const rpc=vi.fn().mockResolvedValue({data:{data:{staff:[],items:[],leaves:[]},meta:{server_time:"2026-10-15T00:00:00Z"}},error:null});await loadManagerScheduleRange({rpc} as never,"org","2026-10-13","2026-10-19");expect(rpc).toHaveBeenCalledWith("timefit_user_mobile_manager_schedule_range",{p_organization_id:"org",p_from:"2026-10-13",p_to:"2026-10-19"});});
  it("sends revision, memo and idempotency key when saving",async()=>{const rpc=vi.fn().mockResolvedValue({data:{schedule:item(),notification_status:"queued",duplicate:false},error:null});await saveManagerSchedule({rpc} as never,"org",draft,"request-1");expect(rpc).toHaveBeenCalledWith("timefit_user_mobile_manager_save_schedule",expect.objectContaining({p_manager_note:"인수인계",p_expected_revision:null,p_request_key:"request-1"}));});
  it("allows an overnight shift and detects a next-day overlap",()=>{expect(validateManagerScheduleDraft(draft,[],[])).toBeNull();expect(validateManagerScheduleDraft(draft,[item({id:"next",work_date:"2026-10-16",starts_at:"05:00:00",ends_at:"09:00:00"})],[])).toContain("겹쳐요");});
  it("blocks approved leave on either side of midnight",()=>{expect(validateManagerScheduleDraft(draft,[],[{id:"l",staff_id:"staff-1",starts_on:"2026-10-16",ends_on:"2026-10-16",leave_type:"연차",day_part:"am"}])).toContain("휴가");});
  it("does not place a day off over an existing shift",()=>{expect(validateManagerScheduleDraft({...draft,isDayOff:true},[item()],[])).toContain("휴무");});
  it("hides writes without schedule.manage and revalidates before mutations",()=>{expect(component).toContain('hasAnyManagementPermission(context,["schedule.manage"])');expect(component).toContain('requireFreshManagementAuthorization(client,context.organizationId,["schedule.manage"])');expect(component).toContain('setConfirm("cancel")');});
  it("isolates caches and explains notification outcomes",()=>{expect(managerScheduleCacheKey("a","o","f","t")).not.toBe(managerScheduleCacheKey("b","o","f","t"));expect(notificationStatusLabel("awaiting_approval")).toContain("승인 완료 후");});
});
