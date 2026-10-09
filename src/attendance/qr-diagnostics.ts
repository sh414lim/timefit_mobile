export type QrDiagnosticStage =
  | "debug_enabled"
  | "scanner_opened"
  | "camera_stream_started"
  | "focus_continuous"
  | "focus_unavailable"
  | "native_detector_available"
  | "native_detector_unavailable"
  | "native_detector_error"
  | "zxing_decoder_error"
  | "qr_detected_zxing"
  | "qr_detected_native"
  | "camera_error"
  | "rpc_started"
  | "rpc_succeeded"
  | "rpc_failed"
  | "rpc_skipped";

export type QrDiagnosticEvent = {
  stage: QrDiagnosticStage;
  label: string;
  detail: string | null;
  occurredAt: string;
};

const labels: Record<QrDiagnosticStage, string> = {
  debug_enabled: "진단 모드 시작",
  scanner_opened: "앱 카메라 열림",
  camera_stream_started: "카메라 영상 수신",
  focus_continuous: "연속 초점 적용",
  focus_unavailable: "연속 초점 미지원",
  native_detector_available: "Android 기본 디코더 준비",
  native_detector_unavailable: "Android 기본 디코더 미지원",
  native_detector_error: "Android 기본 디코더 오류",
  zxing_decoder_error: "ZXing 디코더 오류",
  qr_detected_zxing: "ZXing QR 인식",
  qr_detected_native: "Android 기본 QR 인식",
  camera_error: "카메라 시작 오류",
  rpc_started: "서버 전송 시작",
  rpc_succeeded: "서버 응답 성공",
  rpc_failed: "서버 응답 실패",
  rpc_skipped: "서버 전송 생략",
};

export function qrDiagnosticsEnabled(search: string) {
  return new URLSearchParams(search).get("qrdebug") === "1";
}

export function safeQrDiagnosticDetail(value?: string) {
  if (!value) return null;
  return value
    .replace(/((?:qr|token|request(?:_|-)?key)=)[^\s&]+/gi, "$1[redacted]")
    .slice(0, 160);
}

export function createQrDiagnosticEvent(stage: QrDiagnosticStage, detail?: string, now = new Date()): QrDiagnosticEvent {
  return {
    stage,
    label: labels[stage],
    detail: safeQrDiagnosticDetail(detail),
    occurredAt: now.toISOString(),
  };
}
