"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserContext } from "@/auth/user-context";
import { getSupabaseBrowserClient } from "@/auth/supabase";
import type { MobileRoleContext } from "@/authorization/mobile-context";
import { approvalCacheKey, loadApprovalInbox, reviewApproval, validateReview, type ApprovalInbox, type ApprovalItem, type ApprovalStatus } from "@/approvals/mobile-approvals";
import { useUpdateSafetyBlocker } from "@/pwa/update-safety";
import { notificationTargetId } from "@/notifications/inbox";

const statusLabel: Record<ApprovalStatus, string> = { pending: "승인 대기", approved: "승인", rejected: "반려" };
const kindLabel = { leave: "휴가", schedule: "스케줄" } as const;

function approvalError(error: unknown) {
  const message = String((error as { message?: string })?.message ?? "");
  if (message.includes("approval_already_processed")) return "이미 다른 관리자가 처리한 요청이에요. 목록을 새로고침합니다.";
  if (message.includes("approval_access_denied")) return "이 요청을 처리할 권한이 없어요.";
  if (message.includes("invalid_review_comment")) return "관리자 의견을 확인해 주세요.";
  return "승인 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export function ManagerApprovals({ context, userContext }: { context: MobileRoleContext; userContext: UserContext }) {
  const userId = userContext.profile?.id ?? "manager";
  const cacheKey = approvalCacheKey(userId, context.organizationId);
  const [inbox, setInbox] = useState<ApprovalInbox | null>(null);
  const inboxRef = useRef<ApprovalInbox | null>(null);
  const [tab, setTab] = useState<ApprovalStatus>("pending");
  const [kind, setKind] = useState<"all" | "leave" | "schedule">("all");
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [comment, setComment] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useUpdateSafetyBlocker("approval-write", "승인 결과를 저장 중이에요", saving);

  const refresh = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const next = await loadApprovalInbox(getSupabaseBrowserClient(), context.organizationId);
      inboxRef.current = next; setInbox(next); window.sessionStorage.setItem(cacheKey, JSON.stringify(next));
    } catch {
      setError(inboxRef.current ? "최신 승인 요청을 확인하지 못했어요." : "승인함을 불러오지 못했어요.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [cacheKey, context.organizationId]);

  useEffect(() => {
    const cached = window.sessionStorage.getItem(cacheKey);
    const timer = window.setTimeout(() => {
      if (cached) try { const restored = JSON.parse(cached) as ApprovalInbox; inboxRef.current = restored; setInbox(restored); setLoading(false); } catch { window.sessionStorage.removeItem(cacheKey); }
      void refresh(Boolean(cached));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cacheKey, refresh]);

  useEffect(() => {
    if (!inbox) return;
    const timer = window.setTimeout(() => {
      const targetId = notificationTargetId(`/${window.location.hash}`);
      const target = inbox.items.find((item) => item.id === targetId && item.kind === "leave");
      if (!target) return;
      setTab(target.status); setKind("leave"); setSelected(target); setComment(target.review_comment ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [inbox]);

  const items = useMemo(() => (inbox?.items ?? []).filter((item) => item.status === tab && (kind === "all" || item.kind === kind)), [inbox?.items, kind, tab]);

  function beginReview(nextDecision: "approved" | "rejected") {
    const validation = validateReview(nextDecision, comment);
    if (validation) { setError(validation); return; }
    setError(""); setDecision(nextDecision);
  }

  async function submitReview() {
    if (!selected || !decision) return;
    setSaving(true); setError("");
    try {
      await reviewApproval(getSupabaseBrowserClient(), context.organizationId, selected, decision, comment.trim(), requestKey);
      setNotice(decision === "approved" ? "요청을 승인했어요." : "요청을 반려했어요.");
      setSelected(null); setDecision(null); setComment(""); setRequestKey(crypto.randomUUID());
      await refresh(true);
    } catch (nextError) {
      setError(approvalError(nextError));
      if (String((nextError as { message?: string })?.message ?? "").includes("approval_already_processed")) await refresh(true);
    } finally { setSaving(false); }
  }

  if (loading && !inbox) return <section className="approval-state" aria-busy="true"><div className="spinner"/><h2>승인 요청을 불러오고 있어요</h2></section>;
  if (error && !inbox) return <section className="approval-state error"><span>연결 오류</span><h2>{error}</h2><button className="primary-button" onClick={() => void refresh()}>다시 시도</button></section>;

  return <section className="manager-approvals">
    <div className="approval-summary"><article className="primary"><span>승인 대기</span><strong>{inbox?.counts.pending ?? 0}<small>건</small></strong><p>처리가 필요한 요청이에요.</p></article><article><span>승인 완료</span><strong>{inbox?.counts.approved ?? 0}<small>건</small></strong><p>최근 처리 결과를 포함해요.</p></article><article><span>반려</span><strong>{inbox?.counts.rejected ?? 0}<small>건</small></strong><p>사유와 함께 기록돼요.</p></article></div>
    {notice && <div className="approval-notice" role="status">{notice}</div>}{error && <div className="approval-error" role="alert">{error}<button onClick={() => setError("")}>닫기</button></div>}
    <div className="approval-tools"><div className="approval-tabs" role="tablist">{(["pending", "approved", "rejected"] as ApprovalStatus[]).map((status) => <button role="tab" aria-selected={tab === status} className={tab === status ? "active" : ""} key={status} onClick={() => setTab(status)}>{statusLabel[status]}</button>)}</div><select aria-label="요청 종류" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="all">전체 요청</option><option value="leave">휴가</option><option value="schedule">스케줄</option></select><button className="approval-refresh" onClick={() => void refresh(true)} disabled={refreshing}>{refreshing ? "동기화 중…" : "새로고침"}</button></div>
    <div className="approval-list">{items.length ? items.map((item) => <button className="approval-card" key={`${item.kind}:${item.id}`} onClick={() => { setSelected(item); setComment(item.review_comment ?? ""); setDecision(null); setError(""); }}><div><span className={`approval-kind ${item.kind}`}>{kindLabel[item.kind]}</span><time>{item.submitted_at.slice(0, 10)}</time></div><strong>{item.staff_name} · {item.title}</strong><p>{item.starts_on === item.ends_on ? item.starts_on : `${item.starts_on} ~ ${item.ends_on}`}</p><small>{item.category_name ?? "소속 미지정"} · {item.detail}</small></button>) : <div className="approval-empty"><strong>{statusLabel[tab]} 요청이 없어요</strong><p>새 요청이 접수되면 이곳에 표시됩니다.</p></div>}</div>
    {inbox && <p className="approval-sync">사업장 시간대 {inbox.timezone} · 마지막 동기화 {new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: inbox.timezone }).format(new Date(inbox.serverTime))}</p>}
    {selected && <div className="approval-modal" role="dialog" aria-modal="true" aria-label="승인 요청 상세"><div className="approval-modal-card"><div className="approval-modal-heading"><div><span>{kindLabel[selected.kind]} 요청</span><h2>{selected.staff_name} · {selected.title}</h2></div><button aria-label="닫기" onClick={() => { setSelected(null); setDecision(null); }}>×</button></div>{decision ? <div className="approval-confirm"><span>최종 확인</span><strong>{decision === "approved" ? "이 요청을 승인할까요?" : "이 요청을 반려할까요?"}</strong><p>처리 결과는 직원 화면과 관련 데이터에 즉시 반영됩니다.</p>{comment && <small>관리자 의견 · {comment}</small>}<div><button className="secondary-button" onClick={() => setDecision(null)}>돌아가기</button><button className={decision === "approved" ? "primary-button" : "danger-button"} disabled={saving} onClick={() => void submitReview()}>{saving ? "처리 중…" : decision === "approved" ? "승인 확정" : "반려 확정"}</button></div></div> : <><dl className="approval-detail"><div><dt>기간</dt><dd>{selected.starts_on === selected.ends_on ? selected.starts_on : `${selected.starts_on} ~ ${selected.ends_on}`}</dd></div><div><dt>요청 내용</dt><dd>{selected.detail}</dd></div><div><dt>소속</dt><dd>{selected.category_name ?? "미지정"}</dd></div>{selected.reason && <div><dt>직원 사유</dt><dd>{selected.reason}</dd></div>}</dl>{selected.status === "pending" ? <><label>관리자 의견 <small>{comment.length}/500</small><textarea maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="승인 메모 또는 반려 사유를 입력해 주세요."/></label><div className="approval-actions"><button className="danger-button" onClick={() => beginReview("rejected")}>반려</button><button className="primary-button" onClick={() => beginReview("approved")}>승인</button></div></> : <div className="approval-processed">{statusLabel[selected.status]} 처리됨{selected.review_comment ? ` · ${selected.review_comment}` : ""}</div>}</>}</div></div>}
  </section>;
}
