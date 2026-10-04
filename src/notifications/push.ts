import type { SupabaseClient } from "@supabase/supabase-js";

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
  return Boolean(publicKey && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
}

export async function enableSchedulePush(client: SupabaseClient, publicKey: string): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("PUSH_PERMISSION_DENIED");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
  const { error } = await client.rpc("timefit_user_mobile_register_push", {
    p_endpoint: subscription.endpoint,
    p_p256dh: key(subscription, "p256dh"),
    p_auth_secret: key(subscription, "auth"),
    p_user_agent: navigator.userAgent
  });
  if (error) { await subscription.unsubscribe(); throw error; }
}
