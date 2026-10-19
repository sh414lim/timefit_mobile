"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { UserContext } from "@/auth/user-context";
import { getSupabaseBrowserClient } from "@/auth/supabase";
import type { MobileRoleContext } from "@/authorization/mobile-context";
import { hasAnyManagementPermission } from "@/authorization/mobile-context";
import { isAuthorizationChangedError, requireFreshManagementAuthorization } from "@/authorization/action-guard";
import {
  formatReceiptWon,
  isReceiptProcessing,
  loadMobileFinanceDocuments,
  loadMobileReceiptDetail,
  processMobileReceipt,
  receiptStatusLabel,
  uploadMobileReceiptForAx,
  type FinanceDocument,
  type ReceiptDetail,
} from "@/admin/mobile-finance";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

export function ManagerFinance({ context, onAuthorizationChanged }: { context: MobileRoleContext; userContext: UserContext; onAuthorizationChanged: () => Promise<UserContext | null> }) {
  const canUpload = hasAnyManagementPermission(context, ["expense.manage"]);
  const [documents, setDocuments] = useState<FinanceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReceiptDetail | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setDocuments(await loadMobileFinanceDocuments(getSupabaseBrowserClient(), context.organizationId));
    } catch {
      if (!silent) setMessage("지출 증빙을 불러오지 못했어요.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [context.organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const processingCount = useMemo(() => documents.filter(isReceiptProcessing).length, [documents]);
  useEffect(() => {
    if (!processingCount) return;
    const timer = window.setInterval(() => void refresh(true), 4000);
    return () => window.clearInterval(timer);
  }, [processingCount, refresh]);

  async function authorize() {
    const client = getSupabaseBrowserClient();
    await requireFreshManagementAuthorization(client, context.organizationId, ["expense.manage", "expense.receipt.review"]);
    return client;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("receipt");
    if (!(file instanceof File) || !file.size) {
      setMessage("영수증을 촬영하거나 선택해 주세요.");
      return;
    }

    setSaving(true);
    setMessage("원본을 안전하게 저장하고 있어요.");
    try {
      const client = await authorize();
      const document = await uploadMobileReceiptForAx(client, {
        organizationId: context.organizationId,
        file,
        documentDate: String(form.get("documentDate")),
        memo: String(form.get("memo") || ""),
      });
      formElement.reset();
      setMessage("Drive 저장 완료 · AX가 품목과 가격을 분석하고 있어요.");
      await refresh(true);
      try {
        await processMobileReceipt(client, context.organizationId, document.id);
        setDetail(await loadMobileReceiptDetail(client, context.organizationId, document.id));
        setMessage("AX 분석이 완료됐어요. 품목과 가격을 확인해 주세요.");
      } catch (error) {
        setMessage(`원본과 Drive URL은 저장됐지만 AX 분석을 완료하지 못했어요. ${String((error as Error)?.message || "목록에서 다시 요청해 주세요.")}`);
      }
      await refresh(true);
    } catch (error) {
      setMessage(isAuthorizationChangedError(error) ? "지출 증빙 권한이 변경되어 저장하지 않았어요." : String((error as Error)?.message || "영수증을 저장하지 못했어요."));
      if (isAuthorizationChangedError(error)) await onAuthorizationChanged();
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(documentId: string) {
    setOpeningId(documentId);
    try {
      setDetail(await loadMobileReceiptDetail(getSupabaseBrowserClient(), context.organizationId, documentId));
    } catch (error) {
      setMessage(String((error as Error)?.message || "영수증 상세를 불러오지 못했어요."));
    } finally {
      setOpeningId(null);
    }
  }

  async function retry(documentId: string) {
    setRetryingId(documentId);
    setMessage("AX 분석을 다시 요청하고 있어요.");
    try {
      const client = await authorize();
      await processMobileReceipt(client, context.organizationId, documentId);
      setDetail(await loadMobileReceiptDetail(client, context.organizationId, documentId));
      setMessage("AX 분석이 완료됐어요.");
      await refresh(true);
    } catch (error) {
      setMessage(isAuthorizationChangedError(error) ? "지출 증빙 권한이 변경되어 처리하지 않았어요." : String((error as Error)?.message || "AX 분석을 다시 요청하지 못했어요."));
      if (isAuthorizationChangedError(error)) await onAuthorizationChanged();
    } finally {
      setRetryingId(null);
    }
  }

  return <section className="mobile-admin-page finance-page">
    {message && <p className="admin-message" role="status">{message}</p>}

    {canUpload && <section className="admin-card finance-upload-card">
      <header><div><span>Drive 원본 + TimeFit AX</span><h2>영수증 품목 분석</h2></div></header>
      <form className="admin-form" onSubmit={submit}>
        <label className="admin-file">영수증 촬영·선택
          <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required />
          <small>JPG·PNG·WebP · 최대 7MB</small>
        </label>
        <label>사용일<input name="documentDate" type="date" required defaultValue={today()} /></label>
        <label>지출 메모<input name="memo" maxLength={200} placeholder="예: 주방 식자재 구입" /></label>
        <button className="primary-button" disabled={saving}>{saving ? "저장·분석 중…" : "저장하고 AX 분석"}</button>
      </form>
    </section>}

    <section className="admin-card finance-list-card">
      <header>
        <div><span>품목·수량·가격 확인</span><h2>최근 지출 증빙</h2></div>
        <button onClick={() => void refresh()} disabled={loading}>{loading ? "동기화 중…" : "새로고침"}</button>
      </header>
      <div className="admin-list finance-list">
        {documents.length ? documents.map((item) => {
          const extracted = item.extracted_data;
          const retryable = Boolean(item.storage_path) && (item.processing_status === "failed" || item.processing_status === "uploaded");
          return <article key={item.id}>
            <div className="finance-document-summary">
              <strong>{extracted?.merchantName || item.title}</strong>
              <small>{item.document_date || new Date(item.created_at).toLocaleDateString("ko-KR")} · {item.file_name}</small>
              <div className="finance-document-meta">
                {extracted?.totalAmount != null && <b>{formatReceiptWon(extracted.totalAmount)}</b>}
                <span className={`finance-status ${item.processing_status || "waiting"}`}>{receiptStatusLabel(item)}</span>
              </div>
              {item.processing_error && <small className="finance-error">{item.processing_error}</small>}
            </div>
            <div className="finance-actions">
              {(item.processing_status === "completed" || Boolean(extracted)) && <button onClick={() => void openDetail(item.id)} disabled={openingId === item.id}>{openingId === item.id ? "불러오는 중…" : "품목·가격 확인"}</button>}
              {retryable && <button onClick={() => void retry(item.id)} disabled={retryingId === item.id}>{retryingId === item.id ? "요청 중…" : "분석 다시 요청"}</button>}
              {item.external_url && <a href={item.external_url} target="_blank" rel="noreferrer">Drive 원본</a>}
            </div>
          </article>;
        }) : <div className="admin-empty">등록된 영수증이 없어요.</div>}
      </div>
    </section>

    {detail && <div className="admin-sheet-modal finance-detail-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-detail-title">
      <button className="admin-sheet-backdrop" aria-label="닫기" onClick={() => setDetail(null)} />
      <section className="admin-sheet">
        <header>
          <div><span>AX 분석 결과</span><h2 id="receipt-detail-title">{detail.document.extracted_data?.merchantName || detail.document.title}</h2></div>
          <button onClick={() => setDetail(null)} aria-label="닫기">×</button>
        </header>
        <div className="finance-total-card">
          <span>{detail.document.extracted_data?.transactionDate || detail.document.document_date || "사용일 미확인"}</span>
          <strong>{formatReceiptWon(detail.document.extracted_data?.totalAmount)}</strong>
        </div>
        {Math.abs(detail.extraction?.validation_result?.lineItemDifference ?? 0) > 0 && <p className="finance-validation-warning">영수증 합계와 품목 합계가 달라 원본 확인이 필요해요.</p>}
        <div className="finance-line-items">
          <h3>품목 {detail.lineItems.length}개</h3>
          {detail.lineItems.length ? detail.lineItems.map((line) => <article key={line.id}>
            <div><strong>{line.item_name_normalized || line.item_name_raw || `품목 ${line.line_number}`}</strong><small>{line.quantity != null ? `${line.quantity}${line.unit || "개"}` : "수량 미확인"}{line.unit_price != null ? ` · 단가 ${formatReceiptWon(line.unit_price)}` : ""}</small></div>
            <b>{line.line_amount != null ? formatReceiptWon(line.line_amount) : "금액 미확인"}</b>
          </article>) : <div className="admin-empty">인식된 품목이 없어요. Drive 원본을 확인해 주세요.</div>}
        </div>
        {detail.document.external_url && <a className="secondary-button finance-original-link" href={detail.document.external_url} target="_blank" rel="noreferrer">Google Drive 원본 열기</a>}
      </section>
    </div>}
  </section>;
}
