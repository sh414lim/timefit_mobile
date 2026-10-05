export type RequestFailure = "offline" | "timeout" | "transport" | "auth" | "authorization" | "conflict" | "validation" | "unknown";

export class RequestTimeoutError extends Error {
  constructor() { super("request_timeout"); this.name = "RequestTimeoutError"; }
}

export async function withRequestTimeout<T>(request: Promise<T>, timeoutMs = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([request, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new RequestTimeoutError()), timeoutMs); })]);
  } finally { if (timer) clearTimeout(timer); }
}

export function classifyRequestFailure(error: unknown, browserOnline = true): RequestFailure {
  if (!browserOnline) return "offline";
  const message = String((error as { message?: string })?.message ?? error ?? "").toLowerCase();
  const status = Number((error as { status?: number })?.status ?? 0);
  if (error instanceof RequestTimeoutError || message.includes("request_timeout") || message.includes("timeout")) return "timeout";
  if (status === 401 || message.includes("authentication_required") || message.includes("jwt")) return "auth";
  if (status === 403 || message.includes("access_denied") || message.includes("authorization_changed") || message.includes("permission")) return "authorization";
  if (status === 409 || message.includes("already_") || message.includes("conflict")) return "conflict";
  if (status === 400 || message.includes("invalid_") || message.includes("required") || message.includes("overlap") || message.includes("insufficient")) return "validation";
  if (status >= 500 || /failed to fetch|network|load failed|edge function|connection/.test(message)) return "transport";
  return "unknown";
}

export function isAmbiguousWriteFailure(failure: RequestFailure) { return failure === "offline" || failure === "timeout" || failure === "transport"; }
export function isBrowserOnline() { return typeof navigator === "undefined" || navigator.onLine !== false; }
export function scopedCacheKey(feature: string, version: number, userId: string, organizationId: string, role: string) { return `timefit:${feature}:v${version}:${userId}:${organizationId}:${role}`; }
