import type { SupabaseClient } from "@supabase/supabase-js";

export type ReceiptExtraction = {
  merchantName?: string | null;
  transactionDate?: string | null;
  totalAmount?: number | null;
  category?: string | null;
};

export type FinanceDocument = {
  id: string;
  title: string;
  file_name: string;
  storage_path: string | null;
  document_date: string | null;
  memo: string | null;
  external_url: string | null;
  review_status: string | null;
  processing_status: string | null;
  processing_error: string | null;
  extracted_data: ReceiptExtraction | null;
  page_count: number | null;
  created_at: string;
};

export type ReceiptLineItem = {
  id: string;
  line_number: number;
  item_name_raw: string | null;
  item_name_normalized: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_amount: number | null;
  confidence: number | null;
};

export type ReceiptDetail = {
  document: FinanceDocument;
  extraction: { validation_result?: { lineItemDifference?: number | null } } | null;
  lineItems: ReceiptLineItem[];
  runs: Array<{ id: string; status: string; error_code?: string | null }>;
};

const DOCUMENT_COLUMNS = "id,title,file_name,storage_path,document_date,memo,external_url,review_status,processing_status,processing_error,extracted_data,page_count,created_at";
const PROCESSING_STATES = new Set(["queued", "processing"]);

export function isReceiptProcessing(document: Pick<FinanceDocument, "processing_status"> & Partial<Pick<FinanceDocument, "storage_path">>) {
  return PROCESSING_STATES.has(document.processing_status ?? "") || (document.processing_status === "uploaded" && Boolean(document.storage_path));
}

export function receiptStatusLabel(document: Pick<FinanceDocument, "processing_status" | "review_status"> & Partial<Pick<FinanceDocument, "storage_path">>) {
  if (document.processing_status === "failed") return "분석 확인 필요";
  if (document.processing_status === "uploaded" && !document.storage_path) return "Drive 원본 보관";
  if (isReceiptProcessing(document)) return document.processing_status === "uploaded" ? "분석 대기" : "AX 분석 중";
  if (document.review_status === "approved") return "승인 완료";
  if (document.review_status === "change_requested") return "수정 필요";
  if (document.review_status === "submitter_review") return "내용 확인 필요";
  if (document.review_status === "manager_review" || document.review_status === "resubmitted") return "관리자 검토";
  return "검토 대기";
}

export function formatReceiptWon(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

export async function loadMobileFinanceDocuments(client: SupabaseClient, organizationId: string): Promise<FinanceDocument[]> {
  const { data, error } = await client
    .from("timefit_user_finance_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("document_type", "receipt")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as FinanceDocument[];
}

async function sha256File(file: File) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
}

export async function uploadMobileReceiptForAx(client: SupabaseClient, input: { organizationId: string; file: File; documentDate: string; memo: string }) {
  if (!input.file.size) throw new Error("영수증 파일을 선택해 주세요.");
  if (input.file.size > 7 * 1024 * 1024) throw new Error("AX 분석용 이미지는 7MB 이하만 업로드할 수 있어요.");
  if (!input.file.type.startsWith("image/")) throw new Error("AX 품목 분석은 이미지 영수증만 지원해요.");

  const contentSha256 = await sha256File(input.file);
  if (contentSha256) {
    const { data: duplicate, error: duplicateError } = await client
      .from("timefit_user_finance_documents")
      .select("id,title")
      .eq("organization_id", input.organizationId)
      .eq("content_sha256", contentSha256)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) throw new Error("이미 등록된 영수증입니다. 최근 지출 증빙을 확인해 주세요.");
  }

  const user = (await client.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요합니다.");
  const sessionId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const storagePath = `${input.organizationId}/${user.id}/${sessionId}/01-${safeFileName(input.file.name)}`;
  const storage = client.storage.from("timefit-finance-documents");
  const { error: uploadError } = await storage.upload(storagePath, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError) throw uploadError;

  let documentId: string | null = null;
  try {
    const driveBody = new FormData();
    driveBody.set("organizationId", input.organizationId);
    driveBody.set("file", input.file, input.file.name);
    const { data: drive, error: driveError } = await client.functions.invoke("upload-receipt-drive", { body: driveBody });
    if (driveError) {
      const detail = await driveError.context?.json?.().catch(() => null);
      throw new Error(detail?.error || driveError.message || "Google Drive 업로드에 실패했습니다.");
    }
    if (!drive?.file?.id || !drive.file.webViewLink) throw new Error("Google Drive 파일 URL을 받지 못했습니다.");

    const { data: document, error: documentError } = await client
      .from("timefit_user_finance_documents")
      .insert({
        organization_id: input.organizationId,
        document_type: "receipt",
        title: `${input.documentDate} 영수증`,
        file_name: input.file.name,
        storage_path: storagePath,
        storage_provider: "google_drive",
        external_file_id: drive.file.id,
        external_url: drive.file.webViewLink,
        mime_type: input.file.type,
        file_size: input.file.size,
        content_sha256: contentSha256,
        document_date: input.documentDate,
        memo: input.memo.trim() || null,
        uploaded_by: user.id,
        review_status: "submitted",
        processing_status: "uploaded",
        submitted_at: new Date().toISOString(),
        page_count: 1,
        capture_metadata: { source: "manager_mobile", ax: true, driveBackup: true, uploadSessionId: sessionId },
      })
      .select(DOCUMENT_COLUMNS)
      .single();
    if (documentError) throw documentError;
    documentId = document.id;

    const { error: pageError } = await client.from("timefit_user_finance_document_pages").insert({
      organization_id: input.organizationId,
      document_id: document.id,
      page_number: 1,
      storage_path: storagePath,
      mime_type: input.file.type,
      file_size: input.file.size,
      content_sha256: contentSha256,
    });
    if (pageError) throw pageError;
    return document as unknown as FinanceDocument;
  } catch (error) {
    if (documentId) await client.from("timefit_user_finance_documents").delete().eq("id", documentId);
    await storage.remove([storagePath]).catch(() => undefined);
    throw error;
  }
}

async function receiptProcessRequest<T>(client: SupabaseClient, method: "GET" | "POST", input: { organizationId: string; documentId: string }): Promise<T> {
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) throw new Error("로그인이 필요합니다.");
  const search = method === "GET" ? `?${new URLSearchParams({ organizationId: input.organizationId, documentId: input.documentId })}` : "";
  const response = await fetch(`/api/receipt-process${search}`, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(input),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload.error || "영수증 AX 처리를 완료하지 못했어요."));
  return payload as T;
}

export async function processMobileReceipt(client: SupabaseClient, organizationId: string, documentId: string) {
  return receiptProcessRequest<{ ok: boolean; documentId: string; runId: string }>(client, "POST", { organizationId, documentId });
}

export async function loadMobileReceiptDetail(client: SupabaseClient, organizationId: string, documentId: string) {
  return receiptProcessRequest<ReceiptDetail>(client, "GET", { organizationId, documentId });
}
