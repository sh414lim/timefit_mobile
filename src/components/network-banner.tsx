"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getConnectivitySnapshot, getServerConnectivitySnapshot, reportNetworkRecovering, setBrowserConnectivity, subscribeConnectivity } from "@/network/connectivity";

function timeLabel(value: string | null) { return value ? new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : null; }

export function NetworkBanner() {
  const state = useSyncExternalStore(subscribeConnectivity, getConnectivitySnapshot, getServerConnectivitySnapshot);
  useEffect(() => {
    const offline = () => setBrowserConnectivity(false);
    const online = () => { setBrowserConnectivity(true); reportNetworkRecovering(); };
    if (navigator.onLine === false) offline();
    window.addEventListener("offline", offline); window.addEventListener("online", online);
    return () => { window.removeEventListener("offline", offline); window.removeEventListener("online", online); };
  }, []);
  if (state.status === "unknown" || state.status === "online") return null;
  const updated = timeLabel(state.lastSuccessfulAt);
  const copy = state.status === "offline" ? "인터넷 연결이 끊겼어요" : state.status === "recovering" ? "연결을 다시 확인하고 있어요" : "서버 연결이 원활하지 않아요";
  return <aside className={`network-banner ${state.status}`} role="status" aria-live="polite"><span aria-hidden="true">{state.status === "recovering" ? "↻" : "!"}</span><div><strong>{copy}</strong><small>{updated ? `마지막 업데이트 ${updated}` : "서버 확인 전에는 저장이 완료되지 않습니다."}</small></div></aside>;
}
