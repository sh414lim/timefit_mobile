import type { UserContext } from "@/auth/user-context";

export type MobileRole = "employee" | "sub_manager" | "operations_lead" | "owner";
export type MobileSection = "home" | "employees" | "schedule" | "attendance" | "requests" | "approvals" | "workplaces" | "notifications" | "more";

export type MobileRoleContext = {
  id: string;
  organizationId: string;
  organizationName: string;
  role: MobileRole;
  staffId: string | null;
  permissions: string[];
};

export type NavigationItem = { section: MobileSection; label: string; requiredAny?: string[] };

const navigation: Record<MobileRole, NavigationItem[]> = {
  employee: [
    { section: "home", label: "홈" }, { section: "schedule", label: "스케줄" },
    { section: "attendance", label: "출퇴근" }, { section: "requests", label: "요청" },
    { section: "notifications", label: "알림" }, { section: "more", label: "전체" }
  ],
  sub_manager: [
    { section: "home", label: "홈" }, { section: "employees", label: "직원", requiredAny: ["employee.view"] },
    { section: "attendance", label: "근태", requiredAny: ["attendance.view"] },
    { section: "schedule", label: "스케줄", requiredAny: ["schedule.view"] },
    { section: "approvals", label: "승인", requiredAny: ["leave.review", "attendance.review_correction", "schedule.approve"] },
    { section: "notifications", label: "알림" },
    { section: "more", label: "전체" }
  ],
  operations_lead: [
    { section: "home", label: "운영 홈" }, { section: "employees", label: "직원", requiredAny: ["employee.view"] },
    { section: "attendance", label: "근태", requiredAny: ["attendance.view"] },
    { section: "schedule", label: "스케줄", requiredAny: ["schedule.view"] },
    { section: "approvals", label: "승인", requiredAny: ["leave.review", "attendance.review_correction", "schedule.approve"] },
    { section: "notifications", label: "알림" },
    { section: "more", label: "전체" }
  ],
  owner: [
    { section: "home", label: "운영 홈" }, { section: "workplaces", label: "사업장" },
    { section: "attendance", label: "근태" },
    { section: "approvals", label: "승인" }, { section: "notifications", label: "알림" }, { section: "more", label: "전체" }
  ]
};

export const roleLabels: Record<MobileRole, string> = {
  employee: "직원", sub_manager: "서브 관리자", operations_lead: "총책임자", owner: "사장"
};

function managementRole(roleCode: string): MobileRole {
  return roleCode === "executive_chef" || roleCode === "operations_lead" ? "operations_lead" : "sub_manager";
}

export function deriveMobileContexts(context: UserContext): MobileRoleContext[] {
  const membership = context.membership;
  if (!membership) return [];
  const organizationId = membership.organization_id;
  const organizationName = membership.timefit_user_organizations?.name ?? "내 사업장";
  const contexts: MobileRoleContext[] = [];
  if (context.profile || membership.role === "employee") {
    contexts.push({ id: `${organizationId}:employee`, organizationId, organizationName, role: "employee", staffId: context.managementAccount?.staff_id ?? null, permissions: [] });
  }
  if (context.managementAccount?.status === "active") {
    const role = managementRole(context.managementAccount.role_code);
    contexts.push({ id: `${organizationId}:${role}`, organizationId, organizationName, role, staffId: context.managementAccount.staff_id, permissions: context.managementAccount.permissions });
  }
  if (context.isOrganizationOwner) contexts.push({ id: `${organizationId}:owner`, organizationId, organizationName, role: "owner", staffId: context.managementAccount?.staff_id ?? null, permissions: [] });
  return contexts.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}

export function visibleNavigation(context: MobileRoleContext): NavigationItem[] {
  return navigation[context.role].filter((item) => !item.requiredAny || item.requiredAny.some((permission) => context.permissions.includes(permission)));
}

export function canAccessSection(context: MobileRoleContext, section: string): section is MobileSection {
  return visibleNavigation(context).some((item) => item.section === section);
}
