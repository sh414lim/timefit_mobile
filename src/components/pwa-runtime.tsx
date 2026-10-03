"use client";

import { useEffect, useRef, useState } from "react";

export function PwaRuntime() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (registration.waiting && navigator.serviceWorker.controller && active) setWaitingWorker(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller && active) setWaitingWorker(worker);
          });
        });
      } catch (error) {
        console.error("TimeFit service worker registration failed", error);
      }
    };
    const handleControllerChange = () => {
      if (refreshing.current) return;
      refreshing.current = true;
      window.location.reload();
    };
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => {
      active = false;
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!waitingWorker) return null;
  return (
    <aside className="update-banner" role="status" aria-live="polite">
      <div><strong>새 버전이 준비됐어요</strong><span>안전하게 업데이트한 뒤 최신 TimeFit을 사용할 수 있어요.</span></div>
      <button type="button" onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}>업데이트</button>
    </aside>
  );
}
