import { describe, expect, it } from "vitest";
import { maskIdentity, normalizeKoreanPhone, parseLoginIdentity } from "../src/auth/identity";

describe("mobile login identity", () => {
  it.each([
    ["010-1234-5678", "+821012345678"],
    ["01012345678", "+821012345678"],
    ["+82 10 1234 5678", "+821012345678"]
  ])("normalizes %s", (input, expected) => expect(normalizeKoreanPhone(input)).toBe(expected));

  it("normalizes manager email", () => {
    expect(parseLoginIdentity(" Manager@TimeFit.KR ")).toEqual({ kind: "email", value: "manager@timefit.kr" });
  });

  it("rejects names, partial phone numbers, and employee ids", () => {
    expect(parseLoginIdentity("홍길동")).toBeNull();
    expect(parseLoginIdentity("12345678")).toBeNull();
    expect(parseLoginIdentity("TF1234-E0027")).toBeNull();
  });

  it("masks identifiers for display", () => {
    expect(maskIdentity({ kind: "phone", value: "+821012345678" })).toBe("010-****-5678");
    expect(maskIdentity({ kind: "email", value: "manager@timefit.kr" })).toBe("ma***@timefit.kr");
  });
});

