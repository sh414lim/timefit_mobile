import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthorizationChangedError, requireFreshManagementAuthorization } from "../src/authorization/action-guard";
import type { UserContext } from "../src/auth/user-context";

const base: UserContext = {
  profile: { id: "user", display_name: "직원", employee_code: "E1", role: "employee" },
  membership: { organization_id: "org", role: "employee", timefit_user_organizations: { name: "강남점" } },
  managementAccount: { id: "manager", staff_id: "staff", role_code: "manager", status: "active", permissions: ["leave.review"], categoryScopes: [] },
  isOrganizationOwner: false,
  invitation: null
};

function clientWith(context: UserContext) {
  return { functions: { invoke: vi.fn().mockResolvedValue({ data: context, error: null }) } } as unknown as SupabaseClient;
}

describe("fresh management authorization", () => {
  it("allows an important write only after loading current permission state", async () => {
    const client = clientWith(base);
    const result = await requireFreshManagementAuthorization(client, "org", ["leave.review"]);
    expect(result.managementContext.permissions).toContain("leave.review");
    expect(client.functions.invoke).toHaveBeenCalledWith("get-user-context", { method: "GET" });
  });

  it("fails closed after permission removal", async () => {
    const client = clientWith({ ...base, managementAccount: { ...base.managementAccount!, permissions: [] } });
    await expect(requireFreshManagementAuthorization(client, "org", ["leave.review"])).rejects.toBeInstanceOf(AuthorizationChangedError);
  });

  it("fails closed after delegated management is suspended while preserving employee scope", async () => {
    const client = clientWith({ ...base, managementAccount: { ...base.managementAccount!, status: "suspended" } });
    await expect(requireFreshManagementAuthorization(client, "org", ["leave.review"])).rejects.toMatchObject({ status: 403, message: "authorization_changed" });
  });

  it("rejects a permission from another organization", async () => {
    await expect(requireFreshManagementAuthorization(clientWith(base), "other-org", ["leave.review"])).rejects.toMatchObject({ status: 403 });
  });

  it("allows an organization owner without delegated permission rows", async () => {
    const owner = { ...base, managementAccount: null, isOrganizationOwner: true };
    const result = await requireFreshManagementAuthorization(clientWith(owner), "org", ["attendance.manage"]);
    expect(result.managementContext.role).toBe("owner");
  });
});
