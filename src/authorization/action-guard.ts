import type { SupabaseClient } from "@supabase/supabase-js";
import { loadUserContext, type UserContext } from "../auth/user-context";
import { deriveMobileContexts, hasAnyManagementPermission, type MobileRoleContext } from "./mobile-context";

export class AuthorizationChangedError extends Error {
  readonly status = 403;

  constructor() {
    super("authorization_changed");
    this.name = "AuthorizationChangedError";
  }
}

export type FreshManagementAuthorization = {
  userContext: UserContext;
  managementContext: MobileRoleContext;
};

export async function requireFreshManagementAuthorization(
  client: SupabaseClient,
  organizationId: string,
  requiredAny: string[]
): Promise<FreshManagementAuthorization> {
  const userContext = await loadUserContext(client);
  const managementContext = deriveMobileContexts(userContext).find(
    (context) => context.organizationId === organizationId && context.role !== "employee"
  );

  if (!managementContext || !hasAnyManagementPermission(managementContext, requiredAny)) {
    throw new AuthorizationChangedError();
  }

  return { userContext, managementContext };
}

export function isAuthorizationChangedError(error: unknown): error is AuthorizationChangedError {
  return error instanceof AuthorizationChangedError || String((error as { message?: string })?.message ?? error) === "authorization_changed";
}
