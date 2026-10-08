import { describe, expect, it } from "vitest";
import { hasActiveWorkScope, type UserContext } from "../src/auth/user-context";

const base: UserContext = { profile: null, membership: null, managementAccount: null, isOrganizationOwner: false, invitation: null };

describe("authorized mobile work scope", () => {
  it("rejects authenticated but unlinked accounts", () => expect(hasActiveWorkScope(base)).toBe(false));
  it("accepts an organization member", () => expect(hasActiveWorkScope({ ...base, membership: { organization_id: "org", role: "employee" } })).toBe(true));
  it("rejects a suspended management account", () => expect(hasActiveWorkScope({ ...base, membership: { organization_id: "org", role: "manager" }, managementAccount: { id: "m", staff_id: null, role_code: "manager", status: "suspended", permissions: [], categoryScopes: [] } })).toBe(false));
  it("keeps a linked employee signed in when delegated management is suspended", () => expect(hasActiveWorkScope({ ...base, membership: { organization_id: "org", role: "employee" }, managementAccount: { id: "m", staff_id: "staff", role_code: "manager", status: "suspended", permissions: [], categoryScopes: [] } })).toBe(true));
});
