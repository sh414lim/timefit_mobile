"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/auth/supabase";
import { canEnablePush, enableSchedulePush, getPushStatus, pushStatusDescription, type PushUiState } from "@/notifications/push";

export function PushSettingsCard({ isManager }: { isManager: boolean }) {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const [status, setStatus] = useState<PushUiState>("checking");

  useEffect(() => {
    let cancelled = false;
    void getPushStatus(publicKey)
      .then((next) => { if (!cancelled) setStatus(next); })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [publicKey]);

  async function enable() {
    if (!publicKey || !canEnablePush(publicKey)) { setStatus("unsupported"); return; }
    setStatus("saving");
    try {
      await enableSchedulePush(getSupabaseBrowserClient(), publicKey);
      setStatus("enabled");
    } catch (error) {
      setStatus(error instanceof Error && error.message === "PUSH_PERMISSION_DENIED" ? "denied" : "error");
    }
  }

  const disabled = status === "checking" || status === "saving" || status === "enabled" || status === "denied" || status === "unsupported";
  const label = status === "checking" || status === "saving" ? "확인 중" : status === "enabled" ? "설정됨" : status === "denied" ? "권한 필요" : status === "unsupported" ? "지원 안내" : status === "error" ? "다시 시도" : "알림 받기";

  return <div className={`push-opt-in ${status}`}>
    <div><strong>{isManager ? "관리자 일정 푸시 알림" : "업무 푸시 알림"}</strong><span>{pushStatusDescription(status, isManager)}</span></div>
    <button type="button" onClick={() => void enable()} disabled={disabled}>{label}</button>
  </div>;
}
