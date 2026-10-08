import { describe, expect, it } from "vitest";
import { addDays, cacheKey, leaveConflictsWithSchedule, leaveCovers, monthRange, scheduleMinutes, scheduleTargetFromHash, startOfWeek, type ScheduleItem } from "../src/schedule/mobile-schedule";

const shift: ScheduleItem = { id:"s",work_date:"2026-10-04",starts_at:"09:00:00",ends_at:"18:00:00",break_minutes:60,shift_name:"일반",is_day_off:false,updated_at:"2026-10-01T00:00:00Z",schedule_revision:2,acknowledged_revision:1,changed:true,previous:null };

describe("mobile employee schedule", () => {
  it("opens the exact schedule target from a safe notification hash", () => {
    expect(scheduleTargetFromHash("#schedule?date=2026-11-01&id=schedule-1")).toEqual({ date: "2026-11-01", id: "schedule-1" });
    expect(scheduleTargetFromHash("#schedule?date=wrong&id=schedule-1")).toBeNull();
  });

  it("starts weeks on Monday and builds a calendar range", () => {
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28");
    expect(monthRange("2026-10-04")).toEqual({ from: "2026-09-28", to: "2026-11-01" });
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("calculates payable scheduled duration after break", () => {
    expect(scheduleMinutes(shift)).toBe(480);
  });

  it("expands approved leave dates and isolates caches by user and organization", () => {
    const leave = { id:"l",starts_on:"2026-10-02",ends_on:"2026-10-04",leave_type:"연차",amount:3,day_part:"full" as const };
    expect(leaveCovers(leave,"2026-10-03")).toBe(true);
    expect(leaveCovers(leave,"2026-10-05")).toBe(false);
    expect(cacheKey("user-a","org-a","2026-10-01","2026-10-31")).not.toBe(cacheKey("user-b","org-a","2026-10-01","2026-10-31"));
  });

  it("detects full-day and half-day schedule conflicts", () => {
    expect(leaveConflictsWithSchedule({ id:"full",starts_on:"2026-10-04",ends_on:"2026-10-04",leave_type:"연차",amount:1,day_part:"full" },shift)).toBe(true);
    expect(leaveConflictsWithSchedule({ id:"am",starts_on:"2026-10-04",ends_on:"2026-10-04",leave_type:"반차",amount:.5,day_part:"am" },{...shift,starts_at:"14:00:00"})).toBe(false);
    expect(leaveConflictsWithSchedule({ id:"pm",starts_on:"2026-10-04",ends_on:"2026-10-04",leave_type:"반차",amount:.5,day_part:"pm" },{...shift,ends_at:"12:00:00"})).toBe(false);
  });
});
