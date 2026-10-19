import type { SupabaseClient } from "@supabase/supabase-js";

export type ApprovalKind = "leave" | "schedule" | "attendance";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalContext = {
  leave_balance: { granted: number; used: number; pending: number } | null;
  schedule: { work_date: string; starts_at: string | null; ends_at: string | null; shift_name: string | null; is_day_off: boolean }[] | null;
  attendance: { work_date: string; checked_in_at: string | null; checked_out_at: string | null; status: string | null; requested_checked_in_at?: string | null; requested_checked_out_at?: string | null; updated_at?: string | null } | null;
};
export type ApprovalItem = {
  id: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  staff_id: string;
  staff_name: string;
  category_name: string | null;
  starts_on: string;
  ends_on: string;
  title: string;
  detail: string;
  reason: string | null;
  review_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  context: ApprovalContext;
};
export type ApprovalInbox = {
  timezone: string;
  counts: { pending: number; approved: number; rejected: number };
  items: ApprovalItem[];
  serverTime: string;
};

export function approvalCacheKey(userId: string, organizationId: string) {
  return `timefit:approvals:v2:${userId}:${organizationId}`;
}

export async function loadApprovalInbox(client: SupabaseClient, organizationId: string): Promise<ApprovalInbox> {
  const { data, error } = await client.rpc("timefit_user_mobile_approval_inbox", { p_organization_id: organizationId });
  if (error) throw error;
  return { ...(data.data as Omit<ApprovalInbox, "serverTime">), serverTime: data.meta.server_time };
}

export async function reviewApproval(client: SupabaseClient, organizationId: string, item: ApprovalItem, decision: "approved" | "rejected", comment: string, requestKey: string) {
  const { data, error } = await client.rpc("timefit_user_mobile_review_approval", {
    p_organization_id: organizationId,
    p_kind: item.kind,
    p_request_id: item.id,
    p_decision: decision,
    p_comment: comment || null,
    p_request_key: requestKey
  });
  if (error) throw error;
  return data;
}

export function validateReview(decision: "approved" | "rejected", comment: string) {
  const trimmed = comment.trim();
  if (decision === "rejected" && trimmed.length < 2) return "반려 사유를 2자 이상 입력해 주세요.";
  if (trimmed.length > 500) return "관리자 의견은 500자 이하로 입력해 주세요.";
  return "";
}
