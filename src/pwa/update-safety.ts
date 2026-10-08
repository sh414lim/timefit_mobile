"use client";

import { useEffect } from "react";

export type UpdateSafetySnapshot = { safe: boolean; reasons: string[] };

const blockers = new Map<string, string>();
const listeners = new Set<() => void>();
let snapshot: UpdateSafetySnapshot = { safe: true, reasons: [] };

function emit() {
  const reasons = [...new Set(blockers.values())];
  snapshot = { safe: reasons.length === 0, reasons };
  listeners.forEach((listener) => listener());
}

export function setUpdateBlocker(id: string, reason: string, active: boolean): void {
  if (active) blockers.set(id, reason); else blockers.delete(id);
  emit();
}

export function getUpdateSafetySnapshot(): UpdateSafetySnapshot {
  return snapshot;
}

export function subscribeUpdateSafety(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useUpdateSafetyBlocker(id: string, reason: string, active: boolean): void {
  useEffect(() => {
    setUpdateBlocker(id, reason, active);
    return () => setUpdateBlocker(id, reason, false);
  }, [active, id, reason]);
}
