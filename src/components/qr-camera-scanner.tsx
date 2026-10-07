"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

type QrCameraScannerProps = {
  busy: boolean;
  onCancel: () => void;
  onScan: (value: string) => void;
};

export function cameraErrorMessage(error: unknown) {
  const name = String((error as { name?: string }).name ?? "");
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "카메라 권한이 꺼져 있어요. 브라우저 설정에서 카메라를 허용하거나 아래에 QR 코드를 직접 입력해 주세요.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "사용 가능한 카메라를 찾지 못했어요. 다른 기기에서 시도하거나 QR 코드를 직접 입력해 주세요.";
  }
  return "카메라를 시작하지 못했어요. 브라우저를 다시 열거나 QR 코드를 직접 입력해 주세요.";
}

export function QrCameraScanner({ busy, onCancel, onScan }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      const timer = window.setTimeout(() => setError("이 브라우저에서는 카메라를 사용할 수 없어요. QR 코드를 직접 입력해 주세요."), 0);
      return () => window.clearTimeout(timer);
    }

    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 250,
      delayBetweenScanSuccess: 800,
    });
    void reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: "environment" } } },
      videoRef.current ?? undefined,
      (result) => {
        if (!result || handledRef.current || cancelled) return;
        handledRef.current = true;
        controlsRef.current?.stop();
        onScan(result.getText());
      },
    ).then((controls) => {
      if (cancelled) controls.stop();
      else controlsRef.current = controls;
    }).catch((reason: unknown) => {
      if (!cancelled) setError(cameraErrorMessage(reason));
    });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onScan]);

  return <div className="camera-sheet" role="dialog" aria-modal="true" aria-labelledby="camera-title">
    <div className="camera-sheet__header">
      <div><span>매장 QR 스캔</span><h3 id="camera-title">QR 코드를 네모 안에 맞춰 주세요</h3></div>
      <button type="button" className="camera-close" onClick={onCancel} aria-label="카메라 닫기">×</button>
    </div>
    <div className="camera-preview">
      <video ref={videoRef} muted playsInline aria-label="QR 스캔 카메라 화면" />
      {!error && <><div className="camera-frame" aria-hidden="true"/><p>인식하면 출퇴근이 자동으로 처리됩니다.</p></>}
      {error && <div className="camera-error" role="alert"><strong>카메라를 사용할 수 없어요</strong><p>{error}</p><button type="button" className="secondary-button" onClick={onCancel}>직접 입력하기</button></div>}
      {busy && <div className="camera-busy" role="status"><span/><strong>출퇴근을 처리하고 있어요</strong></div>}
    </div>
  </div>;
}
