import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatReceiptWon, isReceiptProcessing, receiptStatusLabel } from "../src/admin/mobile-finance";

const component = readFileSync(new URL("../src/components/manager-finance.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/receipt-process/route.ts", import.meta.url), "utf8");

describe("mobile receipt AX workflow", () => {
  it("labels processing and review states for the mobile list", () => {
    expect(isReceiptProcessing({ processing_status: "queued" })).toBe(true);
    expect(isReceiptProcessing({ processing_status: "uploaded", storage_path: null })).toBe(false);
    expect(receiptStatusLabel({ processing_status: "uploaded", review_status: "submitted", storage_path: null })).toBe("Drive 원본 보관");
    expect(isReceiptProcessing({ processing_status: "completed" })).toBe(false);
    expect(receiptStatusLabel({ processing_status: "failed", review_status: "submitted" })).toBe("분석 확인 필요");
    expect(receiptStatusLabel({ processing_status: "completed", review_status: "submitter_review" })).toBe("내용 확인 필요");
    expect(formatReceiptWon(12500)).toBe("12,500원");
  });

  it("uploads for AX and exposes item and price detail actions", () => {
    expect(component).toContain("uploadMobileReceiptForAx");
    expect(component).toContain("processMobileReceipt");
    expect(component).toContain("품목·가격 확인");
    expect(component).toContain("저장하고 AX 분석");
  });

  it("uses an ASCII-only private storage key for Korean Drive file names", () => {
    const source = readFileSync(new URL("../src/admin/mobile-finance.ts", import.meta.url), "utf8");
    expect(source).toContain('return `receipt${extension ? `.${extension}` : ""}`');
    expect(source).not.toContain("[^a-zA-Z0-9가-힣._-]");
  });

  it("proxies authenticated processing to the web AX endpoint", () => {
    expect(route).toContain("https://timefit-omega.vercel.app");
    expect(route).toContain("Authorization: authorization");
    expect(route).toContain("/api/receipt-process");
    expect(route).toContain("export const maxDuration = 300");
  });
});
