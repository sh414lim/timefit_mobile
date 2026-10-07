import { describe, expect, it } from "vitest";
import { clearPrivateBrowserData, reconcileSessionUser, SESSION_USER_KEY } from "../src/auth/session-storage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("private browser data", () => {
  it("clears TimeFit business data without deleting unrelated preferences", () => {
    const storage = new MemoryStorage();
    storage.setItem("timefit:user:one", "private");
    storage.setItem("workforce:last-org", "private");
    storage.setItem("mobile:cached-home", "private");
    storage.setItem("theme", "light");
    clearPrivateBrowserData(storage);
    expect(storage.getItem("timefit:user:one")).toBeNull();
    expect(storage.getItem("workforce:last-org")).toBeNull();
    expect(storage.getItem("mobile:cached-home")).toBeNull();
    expect(storage.getItem("theme")).toBe("light");
  });

  it("clears both stores only when the authenticated user actually changes", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    local.setItem(SESSION_USER_KEY, "user-one");
    local.setItem("timefit:home", "one");
    session.setItem("mobile:attendance", "one");
    expect(reconcileSessionUser("user-one", local, session)).toBe(false);
    expect(session.getItem("mobile:attendance")).toBe("one");
    expect(reconcileSessionUser("user-two", local, session)).toBe(true);
    expect(local.getItem("timefit:home")).toBeNull();
    expect(session.getItem("mobile:attendance")).toBeNull();
    expect(local.getItem(SESSION_USER_KEY)).toBe("user-two");
  });
});
