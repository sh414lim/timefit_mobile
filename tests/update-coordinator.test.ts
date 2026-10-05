import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateCoordinator } from "../src/pwa/update-coordinator";

class PeerChannel {
  private listeners = new Set<(event: MessageEvent) => void>();
  constructor(public name: string) {}
  addEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listeners.add(listener); }
  removeEventListener(_type: string, listener: (event: MessageEvent) => void) { this.listeners.delete(listener); }
  postMessage(message: { type: string; requestId?: string }) {
    if (message.type === "STATUS_REQUEST") {
      queueMicrotask(() => this.listeners.forEach((listener) => listener({ data: { type: "STATUS_RESPONSE", requestId: message.requestId, senderId: "peer", snapshot: { safe: false, reasons: ["다른 창에서 출퇴근 처리 중"] } } } as MessageEvent)));
    }
  }
  close() {}
}

describe("multi-tab update coordination", () => {
  beforeEach(() => { vi.stubGlobal("BroadcastChannel", PeerChannel); });
  afterEach(() => { vi.unstubAllGlobals(); });
  it("refuses activation when another tab reports pending work", async () => {
    const coordinator = new UpdateCoordinator("test");
    const result = await coordinator.checkAllTabs(1);
    expect(result).toEqual({ safe: false, reasons: ["다른 창에서 출퇴근 처리 중"], peerCount: 1 });
    coordinator.close();
  });
});
