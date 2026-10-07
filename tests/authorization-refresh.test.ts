import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authGate = readFileSync(new URL("../src/components/auth-gate.tsx", import.meta.url), "utf8");

describe("delegated authorization refresh", () => {
  it("reloads user context when the installed app becomes active", () => {
    expect(authGate).toContain('window.addEventListener("focus", refreshActiveContext)');
    expect(authGate).toContain('document.addEventListener("visibilitychange", handleVisibility)');
    expect(authGate).toContain("await resolveSession(data.session, true)");
  });

  it("keeps the last usable screen during a transient background refresh failure", () => {
    expect(authGate).toContain('if (!background) setScreen("error")');
  });
});
