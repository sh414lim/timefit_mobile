import { afterEach, describe, expect, it, vi } from "vitest";
import { canEnablePush, enableSchedulePush, getPushStatus } from "../src/notifications/push";

const originalNotification = globalThis.Notification;
const originalNavigator = globalThis.navigator;
const originalWindow = globalThis.window;

function installBrowser(subscription: PushSubscription | null, permission: NotificationPermission = "granted") {
  const pushManager = { getSubscription: vi.fn().mockResolvedValue(subscription), subscribe: vi.fn() };
  Object.defineProperty(globalThis, "window", { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { serviceWorker: { ready: Promise.resolve({ pushManager }) }, userAgent: "vitest" } });
  Object.defineProperty(globalThis, "PushManager", { configurable: true, value: class PushManager {} });
  Object.defineProperty(globalThis, "Notification", { configurable: true, value: { permission, requestPermission: vi.fn().mockResolvedValue(permission) } });
  return pushManager;
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(globalThis, "Notification", { configurable: true, value: originalNotification });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

describe("mobile push registration", () => {
  it("reports an existing subscription as enabled", async () => {
    installBrowser({} as PushSubscription);
    expect(canEnablePush("public-key")).toBe(true);
    await expect(getPushStatus("public-key")).resolves.toBe("enabled");
  });

  it("does not unsubscribe an existing subscription when server registration fails", async () => {
    const unsubscribe = vi.fn();
    const getKey = vi.fn().mockReturnValue(new Uint8Array([1, 2, 3]).buffer);
    const subscription = { endpoint: "https://push.example/1", expirationTime: null, getKey, unsubscribe } as unknown as PushSubscription;
    installBrowser(subscription);
    const rpc = vi.fn().mockResolvedValue({ error: new Error("register failed") });
    await expect(enableSchedulePush({ rpc } as never, "AQAB")).rejects.toThrow("register failed");
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("does not ask again after notification permission was denied", async () => {
    installBrowser(null, "denied");
    await expect(enableSchedulePush({ rpc: vi.fn() } as never, "AQAB")).rejects.toThrow("PUSH_PERMISSION_DENIED");
    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });
});
