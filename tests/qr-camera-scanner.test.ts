import { describe, expect, it } from "vitest";
import { androidQrCameraConstraints, cameraErrorMessage } from "../src/components/qr-camera-scanner";

describe("Android QR camera scanner", () => {
  it("requests a rear HD camera instead of accepting a low-resolution default", () => {
    const video = androidQrCameraConstraints.video as MediaTrackConstraints;
    expect(video.facingMode).toEqual({ ideal: "environment" });
    expect(video.width).toEqual({ ideal: 1920, min: 1280 });
    expect(video.height).toEqual({ ideal: 1080, min: 720 });
  });

  it("keeps actionable camera permission guidance", () => {
    expect(cameraErrorMessage({ name: "NotAllowedError" })).toContain("카메라를 허용");
    expect(cameraErrorMessage({ name: "NotFoundError" })).toContain("카메라를 찾지 못했어요");
  });
});
