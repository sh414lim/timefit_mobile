"use client";

import { useCallback, useEffect, useState } from "react";
import type { MobileRoleContext, MobileSection } from "@/authorization/mobile-context";
import { getSupabaseBrowserClient } from "@/auth/supabase";
import { loadNotifications, readNotification, safeNotificationPath, safeNotificationSection, type NotificationInbox as Inbox } from "@/notifications/inbox";

type NotificationInboxProps = {
  context: MobileRoleContext;
  onNavigate: (section: MobileSection, path?: string) => void;
  onUnreadCountChange?: (count: number) => void;
};

export function NotificationInbox({ context, onNavigate, onUnreadCountChange }: NotificationInboxProps) {
  const [state, setState] = useState<Inbox | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const inbox = await loadNotifications(getSupabaseBrowserClient(), context.organizationId);
      setState(inbox);
      onUnreadCountChange?.(inbox.unreadCount);
    } catch {
      setError("알림을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [context.organizationId, onUnreadCountChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function open(id: string, path: string) {
    try {
      const saved = safeNotificationPath(await readNotification(getSupabaseBrowserClient(), id) || path);
      const wasUnread = state?.items.find((item) => item.id === id)?.read_at === null;
      const unreadCount = Math.max(0, (state?.unreadCount ?? 0) - Number(wasUnread));
      setState((current) => {
        if (!current) return current;
        return {
          ...current,
          unreadCount,
          items: current.items.map((item) => item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item)
        };
      });
      onUnreadCountChange?.(unreadCount);
      onNavigate(safeNotificationSection(saved) as MobileSection, saved);
    } catch {
      setError("알림을 확인 처리하지 못했어요.");
    }
  }

  if (loading) return <section className="notification-state" aria-busy="true">알림을 불러오는 중…</section>;

  return <section className="notification-inbox">
    <div className="notification-summary">
      <div><span>읽지 않은 알림</span><strong>{state?.unreadCount ?? 0}</strong></div>
      <button onClick={() => void refresh()}>새로고침</button>
    </div>
    {error && <p className="notification-error" role="status">{error}</p>}
    <div className="notification-list">
      {state?.items.length ? state.items.map((item) => <button className={item.read_at ? "read" : "unread"} key={item.id} onClick={() => void open(item.id, item.deeplink_path)}>
        <i />
        <span><b>{item.title}</b><small>{item.body}</small><time>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</time></span>
        <em aria-hidden="true">›</em>
      </button>) : <div className="notification-empty"><strong>새 알림이 없어요</strong><p>스케줄과 업무 변경 알림이 여기에 표시됩니다.</p></div>}
    </div>
  </section>;
}
