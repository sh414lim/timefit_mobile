import { describe, expect, it } from "vitest";
import { installationMessage, isIos, isSafari, isStandalone } from "../src/pwa/install-support";

describe("PWA install environment", () => {
  it("detects iPhone Safari", () => {
    const environment = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1", platform: "iPhone", maxTouchPoints: 5 };
    expect(isIos(environment)).toBe(true); expect(isSafari(environment)).toBe(true); expect(installationMessage(environment)).toBe("ios-safari");
  });
  it("detects iPad desktop mode", () => { expect(isIos({ userAgent: "Mozilla/5.0 Macintosh", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true); });
  it("does not label Chrome on iOS as Safari", () => {
    const environment = { userAgent: "Mozilla/5.0 (iPhone) CriOS/140.0 Mobile/15E148 Safari/604.1" };
    expect(isSafari(environment)).toBe(false); expect(installationMessage(environment)).toBe("ios-other-browser");
  });
  it("prefers installed state over browser guidance", () => {
    const environment = { userAgent: "Android Chrome", standaloneMedia: true };
    expect(isStandalone(environment)).toBe(true); expect(installationMessage(environment)).toBe("installed");
  });
});
