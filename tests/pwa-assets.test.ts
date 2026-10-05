import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root=resolve(import.meta.dirname,"..");
describe("PWA static assets",()=>{
  it.each(["public/icons/icon-192.png","public/icons/icon-512.png","public/icons/icon-maskable-192.png","public/icons/icon-maskable-512.png","public/icons/apple-touch-icon-180.png","public/offline.html","public/sw.js"])("includes %s",path=>{expect(statSync(resolve(root,path)).size).toBeGreaterThan(100)});
  it("does not cache API or authentication traffic",()=>{
    const worker=readFileSync(resolve(root,"public/sw.js"),"utf8");
    expect(worker).toContain('url.pathname.startsWith("/api/")'); expect(worker).not.toContain("supabase.co"); expect(worker).not.toContain("localStorage"); expect(worker).not.toContain("Authorization");
  });
  it("handles schedule push messages and notification deep links",()=>{
    const worker=readFileSync(resolve(root,"public/sw.js"),"utf8");
    expect(worker).toContain('addEventListener("push"'); expect(worker).toContain('addEventListener("notificationclick"'); expect(worker).toContain('notifications|schedule|attendance|requests|approvals');
  });
});
