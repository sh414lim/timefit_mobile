import { describe, expect, it } from "vitest";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { androidQrCameraConstraints, cameraErrorMessage, compatibleQrCameraConstraints, preferredQrCameraConstraints, qrDecodeHints } from "../src/components/qr-camera-scanner";

describe("Android QR camera scanner", () => {
  it("requests the rear camera first and keeps safe compatibility fallbacks", () => {
    const video = androidQrCameraConstraints.video as MediaTrackConstraints;
    expect(video.facingMode).toEqual({ exact: "environment" });
    expect(video.width).toEqual({ ideal: 1280 });
    expect(video.height).toEqual({ ideal: 720 });
    expect((preferredQrCameraConstraints.video as MediaTrackConstraints).facingMode).toEqual({ ideal: "environment" });
    expect(compatibleQrCameraConstraints).toEqual({ audio: false, video: true });
  });

  it("restricts decoding to QR codes and enables the harder scan path", () => {
    expect(qrDecodeHints.get(DecodeHintType.POSSIBLE_FORMATS)).toEqual([BarcodeFormat.QR_CODE]);
    expect(qrDecodeHints.get(DecodeHintType.TRY_HARDER)).toBe(true);
  });

  it("keeps actionable camera permission guidance", () => {
    expect(cameraErrorMessage({ name: "NotAllowedError" })).toContain("카메라를 허용");
    expect(cameraErrorMessage({ name: "NotFoundError" })).toContain("카메라를 찾지 못했어요");
  });
});
