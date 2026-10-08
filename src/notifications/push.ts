import type { SupabaseClient } from "@supabase/supabase-js";

function withTimeout<T>(promise: Promise<T>, milliseconds = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error("PUSH_REQUEST_TIMEOUT")), milliseconds);
    promise.then((value) => { globalThis.clearTimeout(timer); resolve(value); }, (error) => { globalThis.clearTimeout(timer); reject(error); });
  });
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const decoded = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function key(subscription: PushSubscription, name: "p256dh" | "auth"): string {
  const value = subscription.getKey(name);
  if (!value) throw new Error("PUSH_KEY_MISSING");
  return btoa(String.fromCharCode(...new Uint8Array(value)));
}

export function canEnablePush(publicKey?: string): boolean {
  return Boolean(publicKey && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
}

export type PushStatus = "unsupported" | "prompt" | "denied" | "enabled" | "available";
export type PushUiState = PushStatus | "checking" | "saving" | "error";

export function pushStatusDescription(status: PushUiState, isManager: boolean) {
  if (status === "enabled") return isManager ? "나에게 배정된 확정·변경 일정을 이 기기에서 알려드려요." : "확정·변경된 일정을 이 기기에서 알려드려요.";
  if (status === "denied") return "브라우저 설정에서 TimeFit 알림 권한을 허용해 주세요.";
  if (status === "unsupported") return "iPhone은 홈 화면에 설치한 앱에서, Android는 Chrome에서 알림을 사용할 수 있어요.";
  if (status === "error") return "알림 연결에 실패했어요. 네트워크 연결 후 다시 시도해 주세요.";
  return isManager ? "관리자에게 배정된 스케줄 변경을 놓치지 않도록 알려드려요." : "스케줄 변경을 놓치지 않도록 알려드려요.";
}

export async function getPushStatus(publicKey?: string): Promise<PushStatus> {
  if (!canEnablePush(publicKey)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "default") return "prompt";
  const registration = await withTimeout(navigator.serviceWorker.ready);
  return await withTimeout(registration.pushManager.getSubscription()) ? "enabled" : "available";
}

let registrationInFlight: Promise<void> | null = null;

export async function enableSchedulePush(client: SupabaseClient, publicKey: string): Promise<void> {
  if (registrationInFlight) return registrationInFlight;
  registrationInFlight = (async () => {
    if (!canEnablePush(publicKey)) throw new Error("PUSH_UNSUPPORTED");
    const permission = Notification.permission === "default" ? await withTimeout(Notification.requestPermission()) : Notification.permission;
    if (permission !== "granted") throw new Error("PUSH_PERMISSION_DENIED");
    const registration = await withTimeout(navigator.serviceWorker.ready);
    const existing = await withTimeout(registration.pushManager.getSubscription());
    const subscription = existing ?? await withTimeout(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) }));
    const { error } = await client.rpc("timefit_user_mobile_register_push", {
      p_endpoint: subscription.endpoint,
      p_p256dh: key(subscription, "p256dh"),
      p_auth_secret: key(subscription, "auth"),
      p_user_agent: navigator.userAgent,
      p_expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null
    });
    if (error) {
      if (!existing) await subscription.unsubscribe().catch(() => undefined);
      throw error;
    }
  })();
  try { await registrationInFlight; }
  finally { registrationInFlight = null; }
}

export async function revokePushSubscription(client: SupabaseClient): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await withTimeout(navigator.serviceWorker.ready);
  const subscription = await withTimeout(registration.pushManager.getSubscription());
  if (!subscription) return;
  const { error } = await client.rpc("timefit_user_mobile_revoke_push", { p_endpoint: subscription.endpoint });
  if (error) throw error;
  await withTimeout(subscription.unsubscribe());
}
