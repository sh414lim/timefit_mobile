import { describe, expect, it, vi } from "vitest";
import { approvalCacheKey, loadApprovalInbox, reviewApproval, validateReview, type ApprovalItem } from "../src/approvals/mobile-approvals";

describe("MOB-07 manager approvals", () => {
  it("validates rejection comments and comment length", () => {
    expect(validateReview("rejected", "")).toContain("2자");
    expect(validateReview("rejected", "확인")).toBe("");
    expect(validateReview("approved", "a".repeat(501))).toContain("500자");
  });

  it("uses a user and organization scoped cache key", () => {
    expect(approvalCacheKey("manager-1", "org-1")).toBe("timefit:approvals:v1:manager-1:org-1");
  });

  it("loads the approval inbox contract", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { data: { timezone: "Asia/Seoul", counts: { pending: 1, approved: 2, rejected: 0 }, items: [] }, meta: { server_time: "2026-10-04T00:00:00Z" } }, error: null });
    const inbox = await loadApprovalInbox({ rpc } as never, "org-1");
    expect(rpc).toHaveBeenCalledWith("timefit_user_mobile_approval_inbox", { p_organization_id: "org-1" });
    expect(inbox.counts.pending).toBe(1);
  });

  it("sends an idempotency key with a review", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { duplicate: false }, error: null });
    const item = { id: "request-1", kind: "leave" } as ApprovalItem;
    await reviewApproval({ rpc } as never, "org-1", item, "approved", "확인", "key-1");
    expect(rpc).toHaveBeenCalledWith("timefit_user_mobile_review_approval", expect.objectContaining({ p_organization_id: "org-1", p_kind: "leave", p_request_id: "request-1", p_request_key: "key-1" }));
  });
});
