export type LoginIdentity =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string }
  | { kind: "employee-id"; value: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_ID_PATTERN = /^buttervilla\d{4}$/i;

export function normalizeKoreanPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (/^010\d{8}$/.test(digits)) return `+82${digits.slice(1)}`;
  if (/^8210\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

export function parseLoginIdentity(value: string): LoginIdentity | null {
  const trimmed = value.trim();
  if (EMAIL_PATTERN.test(trimmed)) return { kind: "email", value: trimmed.toLowerCase() };
  const phone = normalizeKoreanPhone(trimmed);
  if (phone) return { kind: "phone", value: phone };
  return EMPLOYEE_ID_PATTERN.test(trimmed) ? { kind: "employee-id", value: trimmed.toLowerCase() } : null;
}

export function loginCredentials(identity: LoginIdentity, password: string) {
  if (identity.kind === "phone") return { phone: identity.value, password };
  return { email: identity.kind === "employee-id" ? `${identity.value}@accounts.timefit.local` : identity.value, password };
}

export function maskIdentity(identity: LoginIdentity): string {
  if (identity.kind === "phone") return `010-****-${identity.value.slice(-4)}`;
  if (identity.kind === "employee-id") return identity.value;
  const [name, domain] = identity.value.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}
