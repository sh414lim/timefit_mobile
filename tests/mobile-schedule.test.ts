import { describe, expect, it } from "vitest";
import { addDays, cacheKey, leaveCovers, monthRange, scheduleMinutes, startOfWeek } from "../src/schedule/mobile-schedule";

describe("mobile employee schedule", () => {
  it("starts weeks on Monday and builds a calendar range", () => {
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28");
    expect(monthRange("2026-10-04")).toEqual({ from: "2026-09-28", to: "2026-11-01" });
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("calculates payable scheduled duration after break", () => {
    expect(scheduleMinutes({ id:"s",work_date:"2026-10-04",starts_at:"09:00:00",ends_at:"18:00:00",break_minutes:60,shift_name:"일반",is_day_off:false,updated_at:"2026-10-01T00:00:00Z" })).toBe(480);
  });

  it("expands approved leave dates and isolates caches by user and organization", () => {
    const leave = { id:"l",starts_on:"2026-10-02",ends_on:"2026-10-04",leave_type:"연차",amount:3 };
    expect(leaveCovers(leave,"2026-10-03")).toBe(true);
    expect(leaveCovers(leave,"2026-10-05")).toBe(false);
    expect(cacheKey("user-a","org-a","2026-10-01","2026-10-31")).not.toBe(cacheKey("user-b","org-a","2026-10-01","2026-10-31"));
  });
});
