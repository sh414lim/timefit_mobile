"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MobileRoleContext } from "@/authorization/mobile-context";
import { getSupabaseBrowserClient } from "@/auth/supabase";
import { formatClock } from "@/attendance/manager-attendance";
import { loadTodayAttendance, qrAttendanceErrorMessage, qrTokenFromUrl, recordQrAttendance, type TodayAttendance } from "@/attendance/employee-qr";
import { QrCameraScanner } from "@/components/qr-camera-scanner";
import { reportNetworkFailure, reportNetworkSuccess } from "@/network/connectivity";
import { classifyRequestFailure, isAmbiguousWriteFailure, isBrowserOnline, withRequestTimeout } from "@/network/request-policy";

type Recovery = { token: string; action: "check_in" | "check_out"; requestKey: string };

export function EmployeeAttendance({ context }: { context: MobileRoleContext }) {
  const [state, setState] = useState<TodayAttendance | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const requestKeyRef = useRef(crypto.randomUUID());
  const busyRef = useRef(false);

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
      const value = new URLSearchParams(window.location.search).get("qr");
      if (value) setToken(value);
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const submit = useCallback(async (scannedValue?: string, retry?: Recovery) => {
    if (busyRef.current || !state || state.nextAction === "completed") return;
    const rawToken = retry?.token ?? scannedValue ?? token;
    if (!rawToken.trim()) {
      setMessage("카메라로 매장 QR을 스캔하거나 QR 코드를 직접 입력해 주세요.");
      return;
    }
    const action = retry?.action ?? state.nextAction;
    const requestKey = retry?.requestKey ?? requestKeyRef.current;
    if (navigator.onLine === false) {
      reportNetworkFailure("offline");
      setRecovery({ token: qrTokenFromUrl(rawToken), action, requestKey });
      setMessage("인터넷에 연결되어 있지 않아요. 연결 후 저장 여부를 확인해 주세요.");
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setMessage("");
    try {
      const normalizedToken = qrTokenFromUrl(rawToken);
      setToken(normalizedToken);
      const result = await withRequestTimeout(recordQrAttendance(getSupabaseBrowserClient(), normalizedToken, action, requestKey));
      setState((current) => current ? { ...current, ...result } : result);
      reportNetworkSuccess(result.serverTime); setRecovery(null); requestKeyRef.current = crypto.randomUUID();
      setMessage(action === "check_in" ? "출근 기록을 서버에 저장했어요." : "퇴근 기록을 서버에 저장했어요.");
      window.history.replaceState(null, "", `${window.location.pathname}#attendance`);
      await refresh();
    } catch (error) {
      const failure = classifyRequestFailure(error, isBrowserOnline());
      if (isAmbiguousWriteFailure(failure)) {
        reportNetworkFailure(failure === "offline" ? "offline" : "degraded");
        const latest = await refresh();
        const confirmed = action === "check_in" ? latest?.nextAction !== "check_in" : latest?.nextAction === "completed";
        if (confirmed) { setRecovery(null); requestKeyRef.current = crypto.randomUUID(); setMessage(action === "check_in" ? "서버에서 출근 저장을 확인했어요." : "서버에서 퇴근 저장을 확인했어요."); }
        else { setRecovery({ token: qrTokenFromUrl(rawToken), action, requestKey }); setMessage("저장 결과를 확인하지 못했어요. 연결 후 같은 요청을 다시 확인해 주세요."); }
      } else { reportNetworkSuccess(); setMessage(qrAttendanceErrorMessage(error)); await refresh(); }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [refresh, state, token]);

  const handleScan = useCallback((value: string) => {
    setScanning(false);
    setToken(value);
    void submit(value);
  }, [submit]);

  const actionLabel = state?.nextAction === "check_out" ? "퇴근" : "출근";
  return <section className="employee-attendance">
    <div className="attendance-hero">
      <span>{state?.workDate ?? "오늘"}</span>
      <h2>{state?.nextAction === "check_in" ? "출근 전" : state?.nextAction === "check_out" ? "근무 중" : "오늘 근무 완료"}</h2>
      <div><p>출근 <b>{formatClock(state?.checkedInAt ?? null, state?.timezone ?? "Asia/Seoul")}</b></p><p>퇴근 <b>{formatClock(state?.checkedOutAt ?? null, state?.timezone ?? "Asia/Seoul")}</b></p></div>
    </div>
    <div className="qr-entry">
      <span>버터빌라 매장 QR</span>
      <h3>카메라로 QR을 스캔해 주세요</h3>
      <p className="qr-help">매장에 표시된 QR만 사용할 수 있으며, 스캔 후 서버 시각으로 즉시 기록됩니다.</p>
      <button className="camera-button" disabled={busy || !state || state.nextAction === "completed"} onClick={() => { setMessage(""); setScanning(true); }}><span aria-hidden="true">▣</span>{busy ? "처리 중…" : `카메라로 QR ${actionLabel}`}</button>
      <details className="manual-qr"><summary>카메라를 사용할 수 없나요?</summary><label htmlFor="manual-qr-value">QR 링크 또는 코드 직접 입력</label><input id="manual-qr-value" value={token} onChange={(event) => setToken(event.target.value)} placeholder="QR 링크 또는 코드"/><button className="secondary-button" disabled={busy || !state || state.nextAction === "completed"} onClick={() => void submit()}>{`코드로 ${actionLabel}`}</button></details>
      {message && <p className="attendance-message" role="status" aria-live="polite">{message}</p>}
      {recovery && <div className="request-recovery" role="alert"><span>출퇴근 저장 여부를 다시 확인해야 해요.</span><button disabled={busy || !isBrowserOnline()} onClick={() => void submit(undefined, recovery)}>저장 여부 확인</button></div>}
    </div>
    {scanning && (
      <QrCameraScanner busy={busy} onCancel={() => setScanning(false)} onScan={handleScan}/>
    )}
  </section>;
}
