"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { attendanceQrUrl, rotateAttendanceQr, startAttendanceQr, stopAttendanceQr, type AttendanceQrPayload } from "@/attendance/manager-qr";
import { getSupabaseBrowserClient } from "@/auth/supabase";

export function ManagerQrDisplay({ organizationId, organizationName, onClose }: { organizationId: string; organizationName: string; onClose: () => void }) {
  const [payload, setPayload] = useState<AttendanceQrPayload | null>(null);
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const sessionRef = useRef<string | null>(null);

  const renderPayload = useCallback(async (next: AttendanceQrPayload) => {
    sessionRef.current = next.sessionId;
    setPayload(next);
    setSecondsLeft(Math.max(0, Math.ceil((new Date(next.expiresAt).getTime() - Date.now()) / 1000)));
    setImage(await QRCode.toDataURL(attendanceQrUrl(next.token, window.location.origin), { width: 560, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111827", light: "#ffffff" } }));
  }, []);

  const rotate = useCallback(async () => {
    if (!sessionRef.current) return;
    setError("");
    try { await renderPayload(await rotateAttendanceQr(getSupabaseBrowserClient(), sessionRef.current)); }
    catch { setError("QR을 갱신하지 못했어요. 네트워크 연결 후 다시 시도해 주세요."); }
  }, [renderPayload]);

  useEffect(() => {
    let active = true;
    const client = getSupabaseBrowserClient();
    void startAttendanceQr(client, organizationId).then(async (next) => {
      if (active) await renderPayload(next);
    }).catch(() => { if (active) setError("QR 표시를 시작하지 못했어요. 관리자 권한을 확인해 주세요."); });
    const rotationTimer = window.setInterval(() => void rotate(), 60_000);
    const countdownTimer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1_000);
    return () => {
      active = false;
      window.clearInterval(rotationTimer);
      window.clearInterval(countdownTimer);
      const sessionId = sessionRef.current;
      sessionRef.current = null;
      if (sessionId) void stopAttendanceQr(client, sessionId).catch(() => undefined);
    };
  }, [organizationId, renderPayload, rotate]);

  async function close() {
    const sessionId = sessionRef.current;
    sessionRef.current = null;
    if (sessionId) await stopAttendanceQr(getSupabaseBrowserClient(), sessionId).catch(() => undefined);
    onClose();
  }

  return <section className="manager-qr-panel" aria-live="polite">
    <div className="manager-qr-heading"><div><span>실시간 업장 QR</span><h2>{payload?.organizationName || organizationName} 출퇴근</h2></div><button type="button" onClick={() => void close()} aria-label="QR 표시 닫기">×</button></div>
    {image ? <div className="manager-qr-code"><Image src={image} width={560} height={560} unoptimized alt={`${organizationName} 출퇴근 QR`} priority /></div> : <div className="manager-qr-loading"><span className="spinner" /><strong>보안 QR을 준비하고 있어요</strong></div>}
    <div className="manager-qr-instructions"><strong>직원 개인 휴대전화로 스캔해 주세요</strong><p>로그인한 직원의 버터빌라 소속을 서버에서 확인합니다. 첫 스캔은 출근, 열린 근무가 있으면 퇴근으로 자동 처리돼요.</p>{payload && <span className={secondsLeft <= 15 ? "ending" : ""}>자동 갱신까지 {Math.min(secondsLeft, payload.rotateAfterSeconds)}초</span>}</div>
    {error && <p className="manager-qr-error" role="alert">{error}</p>}
    <div className="manager-qr-actions"><button type="button" className="secondary-button" onClick={() => void rotate()} disabled={!payload}>지금 새 QR 발급</button><button type="button" className="text-button" onClick={() => void close()}>표시 종료</button></div>
  </section>;
}
