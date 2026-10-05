const BUSINESS_DATA_PREFIXES = ["timefit:", "workforce:", "mobile:"];
export const SESSION_USER_KEY = "timefit-auth:user-id";

export function clearPrivateBrowserData(storages?: Storage | Storage[]): void {
  const targets = storages ? (Array.isArray(storages) ? storages : [storages]) : [window.localStorage, window.sessionStorage];
  for (const storage of targets) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key && BUSINESS_DATA_PREFIXES.some((prefix) => key.startsWith(prefix))) storage.removeItem(key);
    }
  }
}

export function reconcileSessionUser(userId: string | null, local: Storage = window.localStorage, session: Storage = window.sessionStorage): boolean {
  const previous = local.getItem(SESSION_USER_KEY);
  const changed = Boolean(previous && previous !== userId);
  if (changed) clearPrivateBrowserData([local, session]);
  if (userId) local.setItem(SESSION_USER_KEY, userId); else local.removeItem(SESSION_USER_KEY);
  return changed;
}
