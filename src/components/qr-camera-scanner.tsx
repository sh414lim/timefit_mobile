"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
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

export const androidQrCameraConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
    aspectRatio: { ideal: 16 / 9 },
  },
};

async function improveAndroidFocus(video: HTMLVideoElement | null) {
  const stream = video?.srcObject;
  if (!(stream instanceof MediaStream)) return;
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const capabilities = track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] };
  if (!capabilities.focusMode?.includes("continuous")) return;
  await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
}

export function QrCameraScanner({ busy, onCancel, onScan }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState("");
  const [needsHelp, setNeedsHelp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      const timer = window.setTimeout(() => setError("이 브라우저에서는 카메라를 사용할 수 없어요. QR 코드를 직접 입력해 주세요."), 0);
      return () => window.clearTimeout(timer);
    }

    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserQRCodeReader(hints, {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 800,
    });
    const helpTimer = window.setTimeout(() => setNeedsHelp(true), 8000);
    void reader.decodeFromConstraints(
      androidQrCameraConstraints,
      videoRef.current ?? undefined,
      (result) => {
        if (!result || handledRef.current || cancelled) return;
        handledRef.current = true;
        window.clearTimeout(helpTimer);
        controlsRef.current?.stop();
        onScan(result.getText());
      },
    ).then((controls) => {
      if (cancelled) controls.stop();
      else {
        controlsRef.current = controls;
        void improveAndroidFocus(videoRef.current).catch(() => undefined);
      }
    }).catch((reason: unknown) => {
      if (!cancelled) setError(cameraErrorMessage(reason));
    });

    return () => {
      cancelled = true;
      window.clearTimeout(helpTimer);
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
      {needsHelp && !error && !busy && <div className="camera-scan-help" role="status"><strong>QR이 잘 보이지 않아요</strong><span>QR 전체가 네모 안에 들어오도록 20~30cm 떨어지고, 화면 반사를 피해주세요.</span></div>}
      {error && <div className="camera-error" role="alert"><strong>카메라를 사용할 수 없어요</strong><p>{error}</p><button type="button" className="secondary-button" onClick={onCancel}>직접 입력하기</button></div>}
      {busy && <div className="camera-busy" role="status"><span/><strong>출퇴근을 처리하고 있어요</strong></div>}
    </div>
  </div>;
}
