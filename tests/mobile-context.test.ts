import { describe, expect, it } from "vitest";
import { canAccessSection, canManageAttendanceQr, deriveMobileContexts, hasAnyManagementPermission, visibleNavigation } from "../src/authorization/mobile-context";
import type { UserContext } from "../src/auth/user-context";

const employee: UserContext = {
  profile: { id: "user", display_name: "직원", employee_code: "E1", role: "employee" },
  membership: { organization_id: "org", role: "employee", timefit_user_organizations: { name: "강남점" } },
  managementAccount: null, isOrganizationOwner: false, invitation: null
};

describe("mobile role contexts", () => {
  it("builds an employee context with employee navigation", () => {
    const [context] = deriveMobileContexts(employee);
    expect(context.role).toBe("employee");
    expect(visibleNavigation(context).map((item) => item.label)).toEqual(["홈", "스케줄", "출퇴근", "요청", "알림", "전체"]);
  });

  it("maps executive chef to operations lead and filters unauthorized tabs", () => {
    const contexts = deriveMobileContexts({ ...employee, managementAccount: { id: "manager", staff_id: "staff", role_code: "executive_chef", status: "active", permissions: ["employee.view"], categoryScopes: [] } });
    const manager = contexts.find((context) => context.role === "operations_lead")!;
    expect(visibleNavigation(manager).map((item) => item.section)).toEqual(["home", "employees", "notifications", "more"]);
    expect(canAccessSection(manager, "approvals")).toBe(false);
  });

  it("shows manager sections for either view or manage permissions", () => {
    const contexts = deriveMobileContexts({
      ...employee,
      managementAccount: {
        id: "manager", staff_id: "staff", role_code: "manager", status: "active",
        permissions: ["employee.manage", "attendance.manage", "schedule.manage"], categoryScopes: []
      }
    });
    const manager = contexts.find((context) => context.role === "sub_manager")!;
    expect(visibleNavigation(manager).map((item) => item.section)).toEqual([
      "home", "employees", "attendance", "schedule", "notifications", "more"
    ]);
  });

  it("gives owners the owner shell without granting it to managers", () => {
    const contexts = deriveMobileContexts({ ...employee, isOrganizationOwner: true });
    expect(contexts.map((context) => context.role)).toContain("owner");
    expect(visibleNavigation(contexts.find((context) => context.role === "owner")!).map((item) => item.label)).toEqual(["운영 홈", "사업장", "근태", "승인", "알림", "전체"]);
  });

  it("omits suspended management contexts", () => {
    const contexts = deriveMobileContexts({ ...employee, managementAccount: { id: "manager", staff_id: null, role_code: "manager", status: "suspended", permissions: ["employee.view"], categoryScopes: [] } });
    expect(contexts.map((context) => context.role)).toEqual(["employee"]);
  });

  it("keeps attendance QR management hidden from view-only managers", () => {
    const contexts = deriveMobileContexts({ ...employee, managementAccount: { id: "manager", staff_id: "staff", role_code: "manager", status: "active", permissions: ["attendance.view"], categoryScopes: [] } });
    const manager = contexts.find((context) => context.role === "sub_manager")!;
    expect(canAccessSection(manager, "attendance")).toBe(true);
    expect(canManageAttendanceQr(manager)).toBe(false);
    expect(hasAnyManagementPermission(manager, ["attendance.view"])).toBe(true);
  });

  it("allows owners and attendance managers to manage attendance QR", () => {
    const manager = deriveMobileContexts({ ...employee, managementAccount: { id: "manager", staff_id: "staff", role_code: "manager", status: "active", permissions: ["attendance.manage"], categoryScopes: [] } }).find((context) => context.role === "sub_manager")!;
    const owner = deriveMobileContexts({ ...employee, isOrganizationOwner: true }).find((context) => context.role === "owner")!;
    expect(canManageAttendanceQr(manager)).toBe(true);
    expect(canManageAttendanceQr(owner)).toBe(true);
  });
});
