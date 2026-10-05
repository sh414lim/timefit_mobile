import {describe,expect,it,vi} from "vitest";
import {attendanceCacheKey,formatClock,loadManagerAttendance} from "../src/attendance/manager-attendance";
describe("MOB-08 manager attendance",()=>{
 it("scopes cache by manager, organization and date",()=>expect(attendanceCacheKey("u","o","2026-10-04")).toBe("timefit:manager-attendance:v1:u:o:2026-10-04"));
 it("loads an organization and date scoped dashboard",async()=>{const rpc=vi.fn().mockResolvedValue({data:{data:{timezone:"Asia/Seoul",workDate:"2026-10-04",counts:{working:1,completed:0,missing:0,scheduled:0},rows:[]},meta:{server_time:"2026-10-04T00:00:00Z"}},error:null});const result=await loadManagerAttendance({rpc} as never,"o","2026-10-04");expect(rpc).toHaveBeenCalledWith("timefit_user_mobile_manager_attendance",{p_organization_id:"o",p_work_date:"2026-10-04"});expect(result.counts.working).toBe(1);});
 it("formats empty clock values safely",()=>expect(formatClock(null,"Asia/Seoul")).toBe("—"));
});
