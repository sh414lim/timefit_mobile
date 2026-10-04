"use client";

import { useEffect, useMemo, useState } from "react";
import { installationMessage, type InstallEnvironment } from "@/pwa/install-support";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Navigator { standalone?: boolean; }
  interface WindowEventMap { beforeinstallprompt: BeforeInstallPromptEvent; }
}

function browserEnvironment(): InstallEnvironment {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standaloneMedia: window.matchMedia("(display-mode: standalone)").matches,
    navigatorStandalone: navigator.standalone,
  };
}

export function InstallCard() {
  const [environment, setEnvironment] = useState<InstallEnvironment | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const environmentFrame = window.requestAnimationFrame(() => setEnvironment(browserEnvironment()));
    const handlePrompt = (event: BeforeInstallPromptEvent) => { event.preventDefault(); setInstallPrompt(event); };
    const handleInstalled = () => { setInstallPrompt(null); setEnvironment(browserEnvironment()); };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.cancelAnimationFrame(environmentFrame);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const state = useMemo(() => environment ? installationMessage(environment) : "loading", [environment]);
  if (dismissed) return <button type="button" className="text-button" onClick={() => setDismissed(false)}>설치 도움말 다시 보기</button>;
  if (state === "installed") {
    return <section className="install-card installed" aria-label="설치 상태"><span className="install-icon" aria-hidden="true">✓</span><div><strong>TimeFit이 설치됐어요</strong><p>홈 화면에서 앱처럼 빠르게 실행할 수 있습니다.</p></div></section>;
  }
  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };
  return (
    <section className="install-card" aria-labelledby="install-title">
      <div className="install-card-heading"><span className="install-icon" aria-hidden="true">↓</span><div><strong id="install-title">홈 화면에 TimeFit 설치</strong><p>주소창 없이 실행하고 더 빠르게 근무 업무를 시작하세요.</p></div></div>
      {installPrompt ? <button type="button" className="primary-button" onClick={install}>설치하기</button>
        : state === "ios-safari" ? <ol className="install-steps"><li>Safari 아래쪽의 공유 버튼을 누르세요.</li><li><b>홈 화면에 추가</b>를 선택하세요.</li><li>오른쪽 위의 <b>추가</b>를 누르세요.</li></ol>
        : state === "ios-other-browser" ? <p className="install-note">iPhone에서는 Safari로 이 페이지를 열어 설치할 수 있어요.</p>
        : <p className="install-note">브라우저 메뉴에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 선택하세요.</p>}
      <button type="button" className="text-button" onClick={() => setDismissed(true)}>나중에</button>
    </section>
  );
}
