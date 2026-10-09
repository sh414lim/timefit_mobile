"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MobileRoleContext } from "@/authorization/mobile-context";
import { getSupabaseBrowserClient } from "@/auth/supabase";
import { formatClock } from "@/attendance/manager-attendance";
import { loadTodayAttendance, qrAttendanceErrorMessage, qrTokenFromUrl, recordQrAttendance, type TodayAttendance } from "@/attendance/employee-qr";
import { createQrDiagnosticEvent, qrDiagnosticsEnabled, type QrDiagnosticEvent, type QrDiagnosticStage } from "@/attendance/qr-diagnostics";
import { QrCameraScanner } from "@/components/qr-camera-scanner";
import { reportNetworkFailure, reportNetworkSuccess } from "@/network/connectivity";
import { classifyRequestFailure, isAmbiguousWriteFailure, isBrowserOnline, withRequestTimeout } from "@/network/request-policy";
import { useUpdateSafetyBlocker } from "@/pwa/update-safety";

type Recovery = { token: string; requestKey: string };

export function EmployeeAttendance({ context }: { context: MobileRoleContext }) {
  const [state, setState] = useState<TodayAttendance | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const [diagnostics, setDiagnostics] = useState<QrDiagnosticEvent[]>([]);
  const requestKeyRef = useRef(crypto.randomUUID());
  const busyRef = useRef(false);
  useUpdateSafetyBlocker("attendance-write", "출퇴근 기록을 처리 중이에요", busy || recovery !== null);

  const addDiagnostic = useCallback((stage: QrDiagnosticStage, detail?: string) => {
    setDiagnostics((current) => [...current.slice(-29), createQrDiagnosticEvent(stage, detail)]);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await withRequestTimeout(loadTodayAttendance(getSupabaseBrowserClient(), context.organizationId));
      setState(next); reportNetworkSuccess(next.serverTime);
      return next;
    } catch (error) {
      const failure = classifyRequestFailure(error, isBrowserOnline());
      if (isAmbiguousWriteFailure(failure)) reportNetworkFailure(failure === "offline" ? "offline" : "degraded"); else reportNetworkSuccess();
      setMessage("오늘 출퇴근 상태를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.");
      return null;
    }
  }, [context.organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const debug = qrDiagnosticsEnabled(window.location.search);
      setDiagnosticsEnabled(debug);
      if (debug) addDiagnostic("debug_enabled", "volatile=true, sensitive=false");
      const value = new URLSearchParams(window.location.search).get("qr");
      if (value) setToken(value);
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [addDiagnostic, refresh]);

  const submit = useCallback(async (scannedValue?: string, retry?: Recovery) => {
    if (busyRef.current || !state || state.nextAction === "completed" || state.nextAction === "review_required") {
      if (diagnosticsEnabled) addDiagnostic("rpc_skipped", !state ? "attendance_state_unavailable" : `next=${state.nextAction}`);
      return;
    }
    const rawToken = retry?.token ?? scannedValue ?? token;
    if (!rawToken.trim()) {
      setMessage("카메라로 매장 QR을 스캔하거나 QR 코드를 직접 입력해 주세요.");
      return;
    }
    const requestKey = retry?.requestKey ?? requestKeyRef.current;
    if (navigator.onLine === false) {
      reportNetworkFailure("offline");
      setRecovery({ token: qrTokenFromUrl(rawToken), requestKey });
      setMessage("인터넷에 연결되어 있지 않아요. 연결 후 저장 여부를 확인해 주세요.");
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setMessage("");
    try {
      const normalizedToken = qrTokenFromUrl(rawToken);
      setToken(normalizedToken);
      if (diagnosticsEnabled) addDiagnostic("rpc_started", `token_length=${normalizedToken.length}`);
      const result = await withRequestTimeout(recordQrAttendance(getSupabaseBrowserClient(), normalizedToken, requestKey));
      if (diagnosticsEnabled) addDiagnostic("rpc_succeeded", `action=${result.action ?? result.nextAction}, duplicate=${Boolean(result.duplicate)}`);
      setState((current) => current ? { ...current, ...result } : result);
      reportNetworkSuccess(result.serverTime); setRecovery(null); requestKeyRef.current = crypto.randomUUID();
      setMessage(result.action === "review_required" ? "이전 근무가 18시간을 초과해 관리자 확인이 필요해요." : result.duplicate ? `이미 처리된 ${result.action === "check_out" ? "퇴근" : "출근"} 기록을 확인했어요.` : result.action === "check_out" ? "퇴근 기록을 서버에 저장했어요." : "출근 기록을 서버에 저장했어요.");
      window.history.replaceState(null, "", `${window.location.pathname}#attendance`);
      await refresh();
    } catch (error) {
      const failure = classifyRequestFailure(error, isBrowserOnline());
      if (diagnosticsEnabled) addDiagnostic("rpc_failed", `category=${failure}`);
      if (isAmbiguousWriteFailure(failure)) {
        reportNetworkFailure(failure === "offline" ? "offline" : "degraded");
        await refresh();
        setRecovery({ token: qrTokenFromUrl(rawToken), requestKey }); setMessage("저장 결과를 확인하지 못했어요. 연결 후 같은 요청을 다시 확인해 주세요.");
      } else { reportNetworkSuccess(); setMessage(qrAttendanceErrorMessage(error)); await refresh(); }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [addDiagnostic, diagnosticsEnabled, refresh, state, token]);

  const handleScan = useCallback((value: string) => {
    setScanning(false);
    setToken(value);
    void submit(value);
  }, [submit]);

  const actionLabel = state?.nextAction === "check_out" ? "퇴근" : "출근";
  const scanDisabled = busy || !state || state.nextAction === "completed" || state.nextAction === "review_required";
  return <section className="employee-attendance">
    <div className="attendance-hero">
      <span>{state?.workDate ?? "오늘"}</span>
      <h2>{state?.nextAction === "check_in" ? "출근 전" : state?.nextAction === "check_out" ? "근무 중" : state?.nextAction === "review_required" ? "관리자 확인 필요" : "오늘 근무 완료"}</h2>
      <div><p>출근 <b>{formatClock(state?.checkedInAt ?? null, state?.timezone ?? "Asia/Seoul")}</b></p><p>퇴근 <b>{formatClock(state?.checkedOutAt ?? null, state?.timezone ?? "Asia/Seoul")}</b></p></div>
    </div>
    <div className="qr-entry">
      <span>{state?.workplaceName ?? context.organizationName} 업장 QR</span>
      <h3>카메라로 QR을 스캔해 주세요</h3>
      <p className="qr-help">매장에 표시된 QR만 사용할 수 있으며, 스캔 후 서버 시각으로 즉시 기록됩니다.</p>
      <button className="camera-button" disabled={scanDisabled} onClick={() => { setMessage(""); setScanning(true); }}><span aria-hidden="true">▣</span>{busy ? "처리 중…" : `QR 스캔으로 ${actionLabel}`}</button>
      <details className="manual-qr"><summary>카메라를 사용할 수 없나요?</summary><label htmlFor="manual-qr-value">QR 링크 또는 코드 직접 입력</label><input id="manual-qr-value" value={token} onChange={(event) => setToken(event.target.value)} placeholder="QR 링크 또는 코드"/><button className="secondary-button" disabled={scanDisabled} onClick={() => void submit()}>{`코드로 ${actionLabel}`}</button></details>
      {message && <p className="attendance-message" role="status" aria-live="polite">{message}</p>}
      {recovery && <div className="request-recovery" role="alert"><span>출퇴근 저장 여부를 다시 확인해야 해요.</span><button disabled={busy || !isBrowserOnline()} onClick={() => void submit(undefined, recovery)}>저장 여부 확인</button></div>}
    </div>
    {diagnosticsEnabled && <section className="qr-diagnostics" aria-live="polite">
      <div><span>Android QR 진단</span><button type="button" onClick={() => setDiagnostics([])}>지우기</button></div>
      <p>이 화면에만 임시 표시되며 QR 값·계정정보는 기록하지 않습니다.</p>
      <ol>{diagnostics.length ? diagnostics.map((event, index) => <li key={`${event.occurredAt}-${index}`}><time>{new Date(event.occurredAt).toLocaleTimeString("ko-KR", { hour12: false })}</time><strong>{event.label}</strong>{event.detail && <code>{event.detail}</code>}</li>) : <li className="empty">아직 진단 이벤트가 없습니다.</li>}</ol>
    </section>}
    {scanning && (
      <QrCameraScanner busy={busy} onCancel={() => setScanning(false)} onDiagnostic={diagnosticsEnabled ? addDiagnostic : undefined} onScan={handleScan}/>
    )}
  </section>;
}
