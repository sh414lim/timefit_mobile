"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useEffect, useRef, useState } from "react";
import type { QrDiagnosticStage } from "@/attendance/qr-diagnostics";

type QrCameraScannerProps = {
  busy: boolean;
  onCancel: () => void;
  onDiagnostic?: (stage: QrDiagnosticStage, detail?: string) => void;
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
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

export const compatibleQrCameraConstraints: MediaStreamConstraints = {
  audio: false,
  video: true,
};

export const qrDecodeHints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
]);

type NativeBarcode = { rawValue?: string };
type NativeBarcodeDetector = { detect(source: HTMLVideoElement): Promise<NativeBarcode[]> };
type NativeBarcodeDetectorConstructor = new (options: { formats: string[] }) => NativeBarcodeDetector;

function createNativeQrDetector() {
  const Detector = (window as typeof window & { BarcodeDetector?: NativeBarcodeDetectorConstructor }).BarcodeDetector;
  if (!Detector) return null;
  try {
    return new Detector({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

function cameraStreamDetail(video: HTMLVideoElement | null) {
  const stream = video?.srcObject;
  if (!(stream instanceof MediaStream)) return "stream=unavailable";
  const settings = stream.getVideoTracks()[0]?.getSettings();
  return `${settings?.width ?? video?.videoWidth ?? 0}x${settings?.height ?? video?.videoHeight ?? 0}, facing=${settings?.facingMode ?? "unknown"}`;
}

function safeErrorName(error: unknown) {
  return String((error as { name?: string }).name || "UnknownError").slice(0, 80);
}

export async function waitForCameraPreview(video: HTMLVideoElement | null, timeoutMs = 4000) {
  if (!video) return false;
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const stream = video.srcObject;
    const track = stream instanceof MediaStream ? stream.getVideoTracks()[0] : null;
    if (track?.readyState === "live" && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      return true;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return false;
}

export function QrCameraScanner({ busy, onCancel, onDiagnostic, onScan }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);
  const reportedNativeErrorRef = useRef(false);
  const reportedZxingErrorRef = useRef(false);
  const [error, setError] = useState("");
  const [needsHelp, setNeedsHelp] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let nativeScanTimer: number | null = null;
    let nativeScanRunning = false;
    handledRef.current = false;
    reportedNativeErrorRef.current = false;
    reportedZxingErrorRef.current = false;
    onDiagnostic?.("scanner_opened", `secure=${window.isSecureContext}`);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      onDiagnostic?.("camera_error", "MediaDevicesUnavailable");
      const timer = window.setTimeout(() => setError("이 브라우저에서는 카메라를 사용할 수 없어요. QR 코드를 직접 입력해 주세요."), 0);
      return () => window.clearTimeout(timer);
    }

    const reader = new BrowserQRCodeReader(qrDecodeHints, {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 800,
    });
    const helpTimer = window.setTimeout(() => setNeedsHelp(true), 8000);
    const decode = (result: Parameters<Parameters<typeof reader.decodeFromConstraints>[2]>[0], error: Parameters<Parameters<typeof reader.decodeFromConstraints>[2]>[1]) => {
      if (error && safeErrorName(error) !== "NotFoundException" && !reportedZxingErrorRef.current) {
        reportedZxingErrorRef.current = true;
        onDiagnostic?.("zxing_decoder_error", safeErrorName(error));
      }
      if (!result || handledRef.current || cancelled) return;
      handledRef.current = true;
      onDiagnostic?.("qr_detected_zxing", `length=${result.getText().length}`);
      window.clearTimeout(helpTimer);
      controlsRef.current?.stop();
      onScan(result.getText());
    };
    const startScanner = async () => {
      let lastError: unknown = null;
      const candidates = [androidQrCameraConstraints, compatibleQrCameraConstraints];
      for (let index = 0; index < candidates.length && !cancelled; index += 1) {
        try {
          const controls = await reader.decodeFromConstraints(candidates[index], videoRef.current ?? undefined, decode);
          if (cancelled) {
            controls.stop();
            return;
          }
          controlsRef.current = controls;
          const hasPreview = await waitForCameraPreview(videoRef.current);
          if (!hasPreview && !handledRef.current) {
            onDiagnostic?.("camera_error", `PreviewTimeout, profile=${index + 1}`);
            controls.stop();
            controlsRef.current = null;
            if (videoRef.current) videoRef.current.srcObject = null;
            continue;
          }
          setPreviewReady(true);
          onDiagnostic?.("camera_stream_started", cameraStreamDetail(videoRef.current));
          const detector = createNativeQrDetector();
          onDiagnostic?.(detector ? "native_detector_available" : "native_detector_unavailable");
          const scanWithNativeDetector = async () => {
            const video = videoRef.current;
            if (!detector || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || nativeScanRunning || handledRef.current || cancelled) return;
            nativeScanRunning = true;
            try {
              const detected = await detector.detect(video);
              const value = detected.find((item) => item.rawValue?.trim())?.rawValue?.trim();
              if (!value || handledRef.current || cancelled) return;
              handledRef.current = true;
              onDiagnostic?.("qr_detected_native", `length=${value.length}`);
              window.clearTimeout(helpTimer);
              controlsRef.current?.stop();
              onScan(value);
            } catch (error) {
              // Android 기기별 BarcodeDetector 편차가 있어 ZXing 경로를 계속 유지한다.
              if (!reportedNativeErrorRef.current) {
                reportedNativeErrorRef.current = true;
                onDiagnostic?.("native_detector_error", safeErrorName(error));
              }
            } finally {
              nativeScanRunning = false;
            }
          };
          if (detector) {
            void scanWithNativeDetector();
            nativeScanTimer = window.setInterval(() => void scanWithNativeDetector(), 180);
          }
          return;
        } catch (reason) {
          lastError = reason;
          onDiagnostic?.("camera_error", `${safeErrorName(reason)}, profile=${index + 1}`);
          controlsRef.current?.stop();
          controlsRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
        }
      }
      if (!cancelled) {
        setError(lastError ? cameraErrorMessage(lastError) : "카메라 영상이 표시되지 않아요. 앱을 완전히 종료한 뒤 다시 실행하거나 QR 코드를 직접 입력해 주세요.");
      }
    };
    void startScanner();

    return () => {
      cancelled = true;
      window.clearTimeout(helpTimer);
      if (nativeScanTimer !== null) window.clearInterval(nativeScanTimer);
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onDiagnostic, onScan]);

  return <div className="camera-sheet" role="dialog" aria-modal="true" aria-labelledby="camera-title">
    <div className="camera-sheet__header">
      <div><span>매장 QR 스캔</span><h3 id="camera-title">QR 코드를 네모 안에 맞춰 주세요</h3></div>
      <button type="button" className="camera-close" onClick={onCancel} aria-label="카메라 닫기">×</button>
    </div>
    <div className="camera-preview">
      <video ref={videoRef} muted playsInline autoPlay disablePictureInPicture aria-label="QR 스캔 카메라 화면" />
      {!previewReady && !error && <div className="camera-preview-loading" role="status"><span/><strong>카메라 화면을 준비하고 있어요</strong></div>}
      {!error && <><div className="camera-frame" aria-hidden="true"/><p>QR을 인식하면 서버 시각으로 즉시 기록합니다.</p></>}
      {needsHelp && !error && !busy && <div className="camera-scan-help" role="status"><strong>QR이 잘 보이지 않아요</strong><span>QR 전체가 네모 안에 들어오도록 20~30cm 떨어지고, 화면 반사를 피해주세요.</span></div>}
      {error && <div className="camera-error" role="alert"><strong>카메라를 사용할 수 없어요</strong><p>{error}</p><button type="button" className="secondary-button" onClick={onCancel}>직접 입력하기</button></div>}
      {busy && <div className="camera-busy" role="status"><span/><strong>출퇴근을 처리하고 있어요</strong></div>}
    </div>
  </div>;
}
