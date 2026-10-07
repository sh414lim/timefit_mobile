import type { SupabaseClient } from "@supabase/supabase-js";

export type UserContext = {
  profile: { id: string; display_name: string | null; employee_code: string | null; role: string | null } | null;
  membership: { organization_id: string; role: string; timefit_user_organizations?: { id?: string; name?: string } | null } | null;
  managementAccount: { id: string; staff_id: string | null; role_code: string; status: string; permissions: string[]; categoryScopes: string[] } | null;
  isOrganizationOwner: boolean;
  invitation: { id: string; organization_id: string; status: string; timefit_user_organizations?: { name?: string } | null } | null;
};

export async function loadUserContext(client: SupabaseClient): Promise<UserContext> {
  const { data, error } = await client.functions.invoke<UserContext>("get-user-context", { method: "GET" });
  if (error) throw error;
  if (!data) throw new Error("사용자 정보를 불러오지 못했습니다.");
  return data;
}

export function hasActiveWorkScope(context: UserContext): boolean {
  if (!context.membership) return false;
  if (!context.managementAccount) return true;
  return context.managementAccount.status === "active";
}

