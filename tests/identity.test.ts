import { describe, expect, it } from "vitest";
import { loginCredentials, maskIdentity, normalizeKoreanPhone, parseLoginIdentity } from "../src/auth/identity";

describe("mobile login identity", () => {
  it.each([
    ["010-1234-5678", "+821012345678"],
    ["01012345678", "+821012345678"],
    ["+82 10 1234 5678", "+821012345678"]
  ])("normalizes %s", (input, expected) => expect(normalizeKoreanPhone(input)).toBe(expected));

  it("normalizes manager email", () => {
    expect(parseLoginIdentity(" Manager@TimeFit.KR ")).toEqual({ kind: "email", value: "manager@timefit.kr" });
  });

  it("accepts a Buttervilla employee id and maps it to the private auth email", () => {
    const identity = parseLoginIdentity(" ButterVilla-5678 ");
    expect(identity).toEqual({ kind: "employee-id", value: "buttervilla-5678" });
    expect(loginCredentials(identity!, "password-value")).toEqual({ email: "buttervilla-5678@accounts.timefit.local", password: "password-value" });
  });

  it("rejects names, partial phone numbers, and malformed employee ids", () => {
    expect(parseLoginIdentity("홍길동")).toBeNull();
    expect(parseLoginIdentity("12345678")).toBeNull();
    expect(parseLoginIdentity("buttervilla-12")).toBeNull();
  });

  it("masks identifiers for display", () => {
    expect(maskIdentity({ kind: "phone", value: "+821012345678" })).toBe("010-****-5678");
    expect(maskIdentity({ kind: "email", value: "manager@timefit.kr" })).toBe("ma***@timefit.kr");
    expect(maskIdentity({ kind: "employee-id", value: "buttervilla-5678" })).toBe("buttervilla-5678");
  });
});
