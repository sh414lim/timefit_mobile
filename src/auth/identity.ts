export type LoginIdentity =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  return phone ? { kind: "phone", value: phone } : null;
}

export function maskIdentity(identity: LoginIdentity): string {
  if (identity.kind === "phone") return `010-****-${identity.value.slice(-4)}`;
  const [name, domain] = identity.value.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

