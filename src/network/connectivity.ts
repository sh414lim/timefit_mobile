export type ConnectivityStatus = "unknown" | "online" | "offline" | "degraded" | "recovering";

export type ConnectivitySnapshot = { status: ConnectivityStatus; lastSuccessfulAt: string | null };

let snapshot: ConnectivitySnapshot = { status: "unknown", lastSuccessfulAt: null };
const serverSnapshot: ConnectivitySnapshot = { status: "unknown", lastSuccessfulAt: null };
const listeners = new Set<() => void>();

function publish(next: ConnectivitySnapshot) {
  if (next.status === snapshot.status && next.lastSuccessfulAt === snapshot.lastSuccessfulAt) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function getConnectivitySnapshot() { return snapshot; }
export function getServerConnectivitySnapshot(): ConnectivitySnapshot { return serverSnapshot; }
export function subscribeConnectivity(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function reportNetworkSuccess(at = new Date().toISOString()) { publish({ status: "online", lastSuccessfulAt: at }); }
export function reportNetworkFailure(status: "offline" | "degraded") { publish({ ...snapshot, status }); }
export function reportNetworkRecovering() { publish({ ...snapshot, status: "recovering" }); }
export function setBrowserConnectivity(online: boolean) { publish({ ...snapshot, status: online ? "recovering" : "offline" }); }
export function resetConnectivityForTest() { snapshot = { status: "unknown", lastSuccessfulAt: null }; listeners.clear(); }
