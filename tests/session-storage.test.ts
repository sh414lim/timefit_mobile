import { describe, expect, it } from "vitest";
import { clearPrivateBrowserData } from "../src/auth/session-storage";

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
});

