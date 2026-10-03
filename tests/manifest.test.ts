import { describe, expect, it } from "vitest";
import { timefitManifest } from "../src/pwa/manifest-data";

describe("TimeFit manifest", () => {
  it("uses one stable root identity and standalone display", () => {
    expect(timefitManifest.id).toBe("/"); expect(timefitManifest.start_url).toBe("/"); expect(timefitManifest.scope).toBe("/"); expect(timefitManifest.display).toBe("standalone");
  });
  it("provides install icons including maskable variants", () => {
    const icons = timefitManifest.icons ?? [];
    expect(icons.some(icon=>icon.sizes==="192x192"&&icon.purpose==="any")).toBe(true);
    expect(icons.some(icon=>icon.sizes==="512x512"&&icon.purpose==="any")).toBe(true);
    expect(icons.some(icon=>icon.sizes==="192x192"&&icon.purpose==="maskable")).toBe(true);
    expect(icons.some(icon=>icon.sizes==="512x512"&&icon.purpose==="maskable")).toBe(true);
  });
});
