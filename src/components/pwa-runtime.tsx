"use client";

import { useEffect, useRef, useState } from "react";
import { UpdateCoordinator } from "@/pwa/update-coordinator";
import { getUpdateSafetySnapshot, subscribeUpdateSafety } from "@/pwa/update-safety";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const INITIAL_UPDATE_SAFETY = { safe: true, reasons: [] as string[] };

export function PwaRuntime() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [checking, setChecking] = useState(false);
  const [blockedReasons, setBlockedReasons] = useState<string[]>([]);
  const refreshing = useRef(false);
  const coordinatorRef = useRef<UpdateCoordinator | null>(null);
  const [safety, setSafety] = useState(INITIAL_UPDATE_SAFETY);

  useEffect(() => {
    const refresh = () => setSafety(getUpdateSafetySnapshot());
    refresh();
    return subscribeUpdateSafety(refresh);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    let registration: ServiceWorkerRegistration | null = null;
    const coordinator = new UpdateCoordinator();
    coordinatorRef.current = coordinator;
    coordinator.onPeerActivation(() => { if (!refreshing.current) setBlockedReasons(["다른 창에서 업데이트를 적용하고 있어요"]); });
    const checkUpdate = () => { if (document.visibilityState === "visible" && navigator.onLine !== false) void registration?.update(); };
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        if (registration.waiting && navigator.serviceWorker.controller && active) setWaitingWorker(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration?.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller && active) setWaitingWorker(worker);
          });
        });
        registration.active?.postMessage({ type: "CLIENT_HEALTHY" });
      } catch (error) { console.error("TimeFit service worker registration failed", error); }
    };
    const handleControllerChange = () => {
      if (refreshing.current) return;
      refreshing.current = true;
      window.location.reload();
    };
    const handleVisibility = () => checkUpdate();
    const interval = window.setInterval(checkUpdate, CHECK_INTERVAL_MS);
    if (document.readyState === "complete") void register(); else window.addEventListener("load", register, { once: true });
    window.addEventListener("online", checkUpdate); window.addEventListener("focus", checkUpdate);
    document.addEventListener("visibilitychange", handleVisibility); navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => {
      active = false; window.clearInterval(interval); coordinator.close(); coordinatorRef.current = null;
      window.removeEventListener("load", register); window.removeEventListener("online", checkUpdate); window.removeEventListener("focus", checkUpdate);
      document.removeEventListener("visibilitychange", handleVisibility); navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  async function activateUpdate() {
    if (!waitingWorker || checking) return;
    setChecking(true); setBlockedReasons([]);
    const result = await coordinatorRef.current?.checkAllTabs();
    if (result && !result.safe) { setBlockedReasons(result.reasons); setChecking(false); return; }
    refreshing.current = true; coordinatorRef.current?.announceActivation();
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    window.setTimeout(() => window.location.reload(), 2500);
  }

  if (!waitingWorker) return null;
  const reasons = blockedReasons.length ? blockedReasons : safety.reasons;
  return <aside className="update-banner" role="status" aria-live="polite"><div><strong>{reasons.length ? "작업을 마친 뒤 업데이트할게요" : "새 버전이 준비됐어요"}</strong><span>{reasons[0] ?? "최신 TimeFit으로 안전하게 전환할 수 있어요."}</span></div><button type="button" disabled={checking || !safety.safe} onClick={() => void activateUpdate()}>{checking ? "확인 중" : !safety.safe ? "대기 중" : "업데이트"}</button></aside>;
}
