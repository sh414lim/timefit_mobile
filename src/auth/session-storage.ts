const BUSINESS_DATA_PREFIXES = ["timefit:", "workforce:", "mobile:"];

export function clearPrivateBrowserData(storage: Storage = window.localStorage): void {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key && BUSINESS_DATA_PREFIXES.some((prefix) => key.startsWith(prefix))) storage.removeItem(key);
  }
}

