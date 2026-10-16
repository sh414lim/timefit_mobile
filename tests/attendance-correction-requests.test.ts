import {describe,expect,it,vi} from "vitest";
import {loadAttendanceCorrectionRequests,submitAttendanceCorrectionRequest,validateCorrectionRequest} from "../src/attendance/correction-requests";

describe("MGR-05 attendance correction requests",()=>{
  it("requires a valid clock and reason",()=>{expect(validateCorrectionRequest({workDate:"2026-10-16",checkedIn:"",checkedOut:"18:00",reason:"확인"})).toContain("출근");expect(validateCorrectionRequest({workDate:"2026-10-16",checkedIn:"09:00",checkedOut:"18:00",reason:""})).toContain("사유");});
  it("loads the employee request history",async()=>{const rpc=vi.fn().mockResolvedValue({data:{items:[]},error:null});await loadAttendanceCorrectionRequests({rpc} as never,"org-1");expect(rpc).toHaveBeenCalledWith("timefit_user_mobile_attendance_correction_requests",{p_organization_id:"org-1"});});
  it("submits an idempotent correction request",async()=>{const rpc=vi.fn().mockResolvedValue({data:{request:{},duplicate:false},error:null});await submitAttendanceCorrectionRequest({rpc} as never,"org-1","Asia/Seoul",{workDate:"2026-10-16",checkedIn:"09:00",checkedOut:"18:00",reason:"QR 기록 오류"},"key-1");expect(rpc).toHaveBeenCalledWith("timefit_user_mobile_request_attendance_correction",expect.objectContaining({p_organization_id:"org-1",p_request_key:"key-1",p_reason:"QR 기록 오류"}));});
  it("connects a checkout after midnight to the next date",async()=>{const rpc=vi.fn().mockResolvedValue({data:{request:{},duplicate:false},error:null});await submitAttendanceCorrectionRequest({rpc} as never,"org-1","Asia/Seoul",{workDate:"2026-10-16",checkedIn:"22:00",checkedOut:"02:00",reason:"자정 이후 퇴근"},"key-2");const args=rpc.mock.calls[0][1];expect(args.p_checked_out_at).toContain("2026-10-16T17:00:00.000Z");});
});
