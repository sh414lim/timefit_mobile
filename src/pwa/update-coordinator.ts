import { getUpdateSafetySnapshot, type UpdateSafetySnapshot } from "./update-safety";

type UpdateMessage =
  | { type: "STATUS_REQUEST"; requestId: string; senderId: string }
  | { type: "STATUS_RESPONSE"; requestId: string; senderId: string; snapshot: UpdateSafetySnapshot }
  | { type: "UPDATE_ACTIVATING"; senderId: string };

export type UpdateCheck = UpdateSafetySnapshot & { peerCount: number };

export class UpdateCoordinator {
  private readonly id = crypto.randomUUID();
  private readonly channel: BroadcastChannel | null;
  private activationListener: (() => void) | null = null;

  constructor(channelName = "timefit:pwa-update") {
    this.channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(channelName);
    this.channel?.addEventListener("message", this.onMessage);
  }

  private onMessage = (event: MessageEvent<UpdateMessage>) => {
    const message = event.data;
    if (!message || message.senderId === this.id) return;
    if (message.type === "STATUS_REQUEST") {
      this.channel?.postMessage({ type: "STATUS_RESPONSE", requestId: message.requestId, senderId: this.id, snapshot: getUpdateSafetySnapshot() } satisfies UpdateMessage);
    } else if (message.type === "UPDATE_ACTIVATING") {
      this.activationListener?.();
    }
  };

  onPeerActivation(listener: () => void): void { this.activationListener = listener; }

  async checkAllTabs(timeoutMs = 350): Promise<UpdateCheck> {
    const own = getUpdateSafetySnapshot();
    if (!this.channel) return { ...own, peerCount: 0 };
    const requestId = crypto.randomUUID();
    const peers: UpdateSafetySnapshot[] = [];
    const receive = (event: MessageEvent<UpdateMessage>) => {
      if (event.data?.type === "STATUS_RESPONSE" && event.data.requestId === requestId) peers.push(event.data.snapshot);
    };
    this.channel.addEventListener("message", receive);
    this.channel.postMessage({ type: "STATUS_REQUEST", requestId, senderId: this.id } satisfies UpdateMessage);
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
    this.channel.removeEventListener("message", receive);
    const reasons = [...new Set([own, ...peers].flatMap((snapshot) => snapshot.reasons))];
    return { safe: reasons.length === 0, reasons, peerCount: peers.length };
  }

  announceActivation(): void {
    this.channel?.postMessage({ type: "UPDATE_ACTIVATING", senderId: this.id } satisfies UpdateMessage);
  }

  close(): void { this.channel?.removeEventListener("message", this.onMessage); this.channel?.close(); }
}
