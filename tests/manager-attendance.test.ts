import {describe,expect,it,vi} from "vitest";
import {attendanceCacheKey,formatClock,loadManagerAttendance,parseAttendanceDeepLink} from "../src/attendance/manager-attendance";
describe("MOB-08 manager attendance",()=>{
 it("scopes cache by manager, organization and date",()=>expect(attendanceCacheKey("u","o","2026-10-04")).toBe("timefit:manager-attendance:v1:u:o:2026-10-04"));
 it("loads an organization and date scoped dashboard",async()=>{const rpc=vi.fn().mockResolvedValue({data:{data:{timezone:"Asia/Seoul",workDate:"2026-10-04",counts:{working:1,completed:0,missing:0,scheduled:0},rows:[]},meta:{server_time:"2026-10-04T00:00:00Z"}},error:null});const result=await loadManagerAttendance({rpc} as never,"o","2026-10-04");expect(rpc).toHaveBeenCalledWith("timefit_user_mobile_manager_attendance",{p_organization_id:"o",p_work_date:"2026-10-04"});expect(result.counts.working).toBe(1);});
 it("formats empty clock values safely",()=>expect(formatClock(null,"Asia/Seoul")).toBe("—"));
 it("parses an allowlisted attendance alert target",()=>expect(parseAttendanceDeepLink("#attendance?date=2026-10-06&staff=123e4567-e89b-12d3-a456-426614174000&alert=checkout_after_scheduled_end")).toEqual({date:"2026-10-06",staffId:"123e4567-e89b-12d3-a456-426614174000",alertType:"checkout_after_scheduled_end"}));
 it("drops malformed attendance alert parameters",()=>expect(parseAttendanceDeepLink("#attendance?date=tomorrow&staff=bad&alert=unknown")).toEqual({date:null,staffId:null,alertType:null}));
});
