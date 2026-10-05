import {describe,expect,it} from "vitest";
import {cancelLeave,dayPartLabel,leaveCacheKey,leaveStatusLabel,validateLeaveDraft} from "../src/leave/mobile-leave";

describe("mobile employee leave",()=>{
  it("validates date order, past dates, half-day range and reason length",()=>{
    expect(validateLeaveDraft("","","full","","2026-10-04")).toContain("날짜");
    expect(validateLeaveDraft("2026-10-03","2026-10-03","full","","2026-10-04")).toContain("이전");
    expect(validateLeaveDraft("2026-10-05","2026-10-04","full","","2026-10-04")).toContain("종료일");
    expect(validateLeaveDraft("2026-10-05","2026-10-06","am","","2026-10-04")).toContain("하루");
    expect(validateLeaveDraft("2026-10-05","2026-10-05","pm","a".repeat(501),"2026-10-04")).toContain("500자");
    expect(validateLeaveDraft("2026-10-05","2026-10-05","pm","병원","2026-10-04")).toBeNull();
  });
  it("maps backend states and isolates cached summaries",()=>{
    expect(leaveStatusLabel).toMatchObject({pending:"승인 대기",approved:"승인",rejected:"반려",cancelled:"취소"});
    expect(dayPartLabel.pm).toBe("오후 반차");
    expect(leaveCacheKey("a","org")).not.toBe(leaveCacheKey("b","org"));
  });
  it("sends an idempotency key when cancelling",async()=>{const rpc=async(name:string,args:unknown)=>{expect(name).toBe("timefit_user_mobile_cancel_leave");expect(args).toMatchObject({p_request_key:"cancel-1"});return {data:{id:"leave-1"},error:null};};await cancelLeave({rpc} as never,"org","leave-1","cancel-1");});
});
