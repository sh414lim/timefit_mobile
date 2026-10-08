"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { clearPrivateBrowserData } from "@/auth/session-storage";
import type { UserContext } from "@/auth/user-context";
import { NetworkBanner } from "@/components/network-banner";
import { canAccessSection, deriveMobileContexts, roleLabels, visibleNavigation, type MobileRoleContext, type MobileSection, type NavigationItem } from "@/authorization/mobile-context";
import { getSupabaseBrowserClient } from "@/auth/supabase";
import { loadNotifications } from "@/notifications/inbox";
import { canEnablePush, enableSchedulePush } from "@/notifications/push";

const FeatureLoading = () => <section className="schedule-state" aria-busy="true"><div className="spinner" /><h2>화면을 준비하고 있어요</h2></section>;
const EmployeeSchedule = dynamic(() => import("@/components/employee-schedule").then((module) => module.EmployeeSchedule), { loading: FeatureLoading });
const EmployeeLeave = dynamic(() => import("@/components/employee-leave").then((module) => module.EmployeeLeave), { loading: FeatureLoading });
const ManagerApprovals = dynamic(() => import("@/components/manager-approvals").then((module) => module.ManagerApprovals), { loading: FeatureLoading });
const ManagerAttendance = dynamic(() => import("@/components/manager-attendance").then((module) => module.ManagerAttendance), { loading: FeatureLoading });
const EmployeeAttendance = dynamic(() => import("@/components/employee-attendance").then((module) => module.EmployeeAttendance), { loading: FeatureLoading });
const NotificationInbox = dynamic(() => import("@/components/notification-inbox").then((module) => module.NotificationInbox), { loading: FeatureLoading });

const ACTIVE_CONTEXT_KEY = "timefit:active-context";

type IconName = "home" | "calendar" | "scan" | "request" | "clock" | "approval" | "bell" | "menu" | "users" | "store" | "settings" | "help" | "logout" | "chevron" | "alert" | "check";

const iconPaths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
  calendar: <><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></>,
  request: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  approval: <><path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><path d="m9 14 2 2 9-9M9 2h6v4H9z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  store: <><path d="M3 9 5 3h14l2 6M5 13v8h14v-8M9 21v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.36.71.66 1 .3.29.68.48 1.1.55h.1v4h-.1c-.42.07-.8.26-1.1.55-.3.29-.52.63-.66 1Z"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-.9.7-1.5 1.1-1.5 2.2M12 17h.01"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  alert: <><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16 9"/></>
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

const sectionIcons: Partial<Record<MobileSection, IconName>> = {
  home: "home", schedule: "calendar", attendance: "clock", requests: "request", approvals: "approval", notifications: "bell", more: "menu", employees: "users", workplaces: "store"
};

const primaryOrder: Record<MobileRoleContext["role"], MobileSection[]> = {
  employee: ["home", "schedule", "attendance", "requests", "more"],
  sub_manager: ["home", "attendance", "approvals", "notifications", "more"],
  operations_lead: ["home", "attendance", "approvals", "notifications", "more"],
  owner: ["home", "attendance", "approvals", "notifications", "more"]
};

function primaryNavigation(context: MobileRoleContext, items: NavigationItem[]) {
  return primaryOrder[context.role].map((section) => items.find((item) => item.section === section)).filter((item): item is NavigationItem => Boolean(item));
}

function EmployeeHome({ context, displayName, navigate }: { context: MobileRoleContext; displayName: string; navigate: (section: MobileSection) => void }) {
  return <section className="dashboard-home">
    <article className="action-hero">
      <div className="hero-status"><div><span>오늘 근무</span><strong>근무 상태 확인</strong></div><span className="status-chip">실시간 조회</span></div>
      <p>매장 QR을 스캔하면 소속과 오늘 근무를 확인한 뒤 출근을 기록합니다.</p>
      <button className="hero-action" onClick={() => navigate("attendance")}><Icon name="scan" />매장 QR로 출근하기</button>
    </article>
    <div className="dashboard-section-heading"><h2>내 업무</h2><span>{displayName}님 · {context.organizationName}</span></div>
    <div className="dashboard-list">
      <button onClick={() => navigate("schedule")}><span className="menu-icon blue"><Icon name="calendar" /></span><span><strong>다음 근무 확인</strong><small>확정 일정과 변경 내역을 확인해요</small></span><Icon name="chevron" /></button>
      <button onClick={() => navigate("requests")}><span className="menu-icon green"><Icon name="request" /></span><span><strong>휴가·근무 변경 요청</strong><small>잔여 연차와 처리 상태를 확인해요</small></span><Icon name="chevron" /></button>
    </div>
  </section>;
}

function ManagerHome({ context, navigate }: { context: MobileRoleContext; navigate: (section: MobileSection) => void }) {
  const canReview = canAccessSection(context, "approvals");
  const canViewAttendance = canAccessSection(context, "attendance");
  return <section className="dashboard-home">
    <div className="manager-summary">
      {canViewAttendance && <button onClick={() => navigate("attendance")}><span>오늘 근태</span><strong>직원별 현황</strong><small>출근·퇴근·누락 확인</small></button>}
      {canReview && <button onClick={() => navigate("approvals")}><span>승인 업무</span><strong>요청 검토</strong><small>휴가·근무 변경 처리</small></button>}
    </div>
    <div className="dashboard-section-heading"><h2>우선 확인</h2><span>{context.organizationName}</span></div>
    <div className="dashboard-list">
      {canViewAttendance && <button onClick={() => navigate("attendance")}><span className="menu-icon red"><Icon name="alert" /></span><span><strong>근태 예외 확인</strong><small>지각·누락·장시간 근무를 먼저 확인해요</small></span><Icon name="chevron" /></button>}
      {canReview && <button onClick={() => navigate("approvals")}><span className="menu-icon amber"><Icon name="approval" /></span><span><strong>승인 대기 요청</strong><small>직원 요청을 검토하고 결과를 알려요</small></span><Icon name="chevron" /></button>}
    </div>
  </section>;
}

function MoreMenu({ context, items, onSignOut, navigate }: { context: MobileRoleContext; items: NavigationItem[]; onSignOut: () => Promise<void>; navigate: (section: MobileSection) => void }) {
  const isEmployee = context.role === "employee";
  const secondary = items.filter((item) => !primaryOrder[context.role].includes(item.section) && item.section !== "home");
  return <section className="more-menu">
    <article className="account-card"><span className="account-avatar">{isEmployee ? "직" : "관"}</span><div><strong>{roleLabels[context.role]}</strong><small>{context.organizationName}</small></div><span className="role-chip">{roleLabels[context.role]}</span></article>
    {!isEmployee && secondary.length > 0 && <><div className="dashboard-section-heading"><h2>운영 관리</h2></div><div className="dashboard-list">{secondary.map((item) => <button key={item.section} onClick={() => navigate(item.section)}><span className="menu-icon blue"><Icon name={sectionIcons[item.section] ?? "settings"} /></span><span><strong>{item.label}</strong><small>{item.section === "employees" ? "직원 계정·소속·권한" : item.section === "schedule" ? "근무 일정 편성·변경" : item.section === "workplaces" ? "사업장과 QR 관리" : "운영 상세 메뉴"}</small></span><Icon name="chevron" /></button>)}</div></>}
    <div className="dashboard-section-heading"><h2>계정과 앱</h2></div>
    <div className="dashboard-list">
      <button onClick={() => navigate("notifications")}><span className="menu-icon blue"><Icon name="bell" /></span><span><strong>알림</strong><small>근무와 승인 변경 안내</small></span><Icon name="chevron" /></button>
      <a href="mailto:support@timefit.kr?subject=TimeFit%20모바일%20문의"><span className="menu-icon amber"><Icon name="help" /></span><span><strong>도움말·문의</strong><small>로그인과 QR 문제 해결</small></span><Icon name="chevron" /></a>
    </div>
    <button className="logout-button" onClick={() => void onSignOut()}><Icon name="logout" />로그아웃</button>
  </section>;
}

function initialContext(contexts: MobileRoleContext[], userContext: UserContext): MobileRoleContext | null {
  if (userContext.isOrganizationOwner) return contexts.find((context) => context.role === "owner") ?? contexts[0] ?? null;
  if (userContext.membership?.role !== "employee") return contexts.find((context) => context.role !== "employee") ?? contexts[0] ?? null;
  return contexts.find((context) => context.role === "employee") ?? contexts[0] ?? null;
}

export function RoleShell({ userContext, onSignOut }: { userContext: UserContext; onSignOut: () => Promise<void> }) {
  const contexts = useMemo(() => deriveMobileContexts(userContext), [userContext]);
  const [activeContext, setActiveContext] = useState<MobileRoleContext | null>(() => initialContext(contexts, userContext));
  const [section, setSection] = useState<MobileSection>("home");
  const [deniedSection, setDeniedSection] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const items = activeContext ? visibleNavigation(activeContext) : [];
  const primaryItems = activeContext ? primaryNavigation(activeContext, items) : [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(ACTIVE_CONTEXT_KEY);
      const restored = contexts.find((context) => context.id === stored);
      if (restored) setActiveContext(restored);
      else setActiveContext(initialContext(contexts, userContext));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [contexts, userContext]);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    if (!publicKey || !canEnablePush(publicKey) || Notification.permission !== "granted") return;
    void enableSchedulePush(getSupabaseBrowserClient(), publicKey).catch(() => undefined);
  }, [userContext.profile?.id]);

  useEffect(() => {
    if (!activeContext || !canAccessSection(activeContext, "notifications")) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void loadNotifications(getSupabaseBrowserClient(), activeContext.organizationId)
        .then((inbox) => { if (!cancelled) setUnreadCount(inbox.unreadCount); })
        .catch(() => { if (!cancelled) setUnreadCount(null); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeContext]);

  useEffect(() => {
    if (!activeContext || !("serviceWorker" in navigator) || !canAccessSection(activeContext, "notifications")) return;
    const refreshUnread = (event: MessageEvent) => {
      if (event.data?.type !== "TIMEFIT_NOTIFICATION_RECEIVED") return;
      void loadNotifications(getSupabaseBrowserClient(), activeContext.organizationId)
        .then((inbox) => setUnreadCount(inbox.unreadCount))
        .catch(() => undefined);
    };
    navigator.serviceWorker.addEventListener("message", refreshUnread);
    return () => navigator.serviceWorker.removeEventListener("message", refreshUnread);
  }, [activeContext]);

  useEffect(() => {
    const syncHash = () => {
      if (!activeContext) return;
      const requested = (window.location.hash.replace("#", "").split("?")[0] || "home");
      if (canAccessSection(activeContext, requested)) { setDeniedSection(null); setSection(requested); }
      else { setDeniedSection(requested); setSection("home"); }
    };
    const timer = window.setTimeout(syncHash, 0);
    window.addEventListener("hashchange", syncHash);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", syncHash); };
  }, [activeContext]);

  if (!activeContext) return <section className="role-empty"><h1>사용 가능한 역할이 없어요</h1><p>관리자에게 사업장과 역할 설정을 요청해 주세요.</p><button className="secondary-button" onClick={onSignOut}>로그아웃</button></section>;

  function switchContext(contextId: string) {
    const next = contexts.find((context) => context.id === contextId);
    if (!next) return;
    clearPrivateBrowserData();
    setUnreadCount(null);
    window.localStorage.setItem(ACTIVE_CONTEXT_KEY, next.id);
    window.history.replaceState(null, "", "#home");
    setDeniedSection(null); setSection("home"); setActiveContext(next);
  }

  function navigate(next: MobileSection, path?: string) {
    if (!activeContext) return;
    if (!canAccessSection(activeContext, next)) { setDeniedSection(next); return; }
    const destination=path?.startsWith(`/#${next}`)?path:`/#${next}`;
    window.history.pushState(null, "", destination);
    setDeniedSection(null); setSection(next);
  }

  const displayName = userContext.profile?.display_name ?? "TimeFit 사용자";
  const isEmployee = activeContext.role === "employee";
  const pageLabels: Partial<Record<MobileSection, { eyebrow: string; title: string; description: string }>> = {
    schedule: { eyebrow: "내 근무 일정", title: "일정", description: "확정 일정과 변경 내역을 한눈에 확인해요." },
    attendance: isEmployee ? { eyebrow: activeContext.organizationName, title: "QR 출퇴근", description: "매장 QR로 오늘 출퇴근을 안전하게 기록해요." } : { eyebrow: "오늘 운영", title: "근태 현황", description: "직원별 출퇴근 상태와 예외를 확인해요." },
    requests: { eyebrow: "휴가·근무 변경", title: "요청", description: "잔여 연차와 요청 처리 상태를 확인해요." },
    approvals: { eyebrow: "처리가 필요한 요청", title: "승인", description: "휴가와 근무 변경 요청을 검토해요." },
    notifications: { eyebrow: "업무 변경 안내", title: "알림", description: "내가 확인해야 할 변화를 모아 보여드려요." },
    more: { eyebrow: "계정과 앱 설정", title: "전체", description: "보조 업무와 앱 설정을 관리해요." }
  };
  const page = pageLabels[section];

  return <main className="mobile-shell">
    <NetworkBanner />
    <header className="mobile-header">
      <div className="mobile-identity"><span>{activeContext.organizationName}</span><strong>{displayName}님</strong></div>
      <div className="header-actions">
        {section !== "notifications" && <button className="header-icon-button" aria-label={unreadCount ? `읽지 않은 알림 ${unreadCount}개` : "알림 열기"} onClick={() => navigate("notifications")}><Icon name="bell" />{Boolean(unreadCount) && <span className="header-alert-dot" />}</button>}
        {contexts.length > 1 ? <label className="context-select"><span className="sr-only">활성 역할</span><select aria-label="활성 역할" value={activeContext.id} onChange={(event) => switchContext(event.target.value)}>{contexts.map((context) => <option key={context.id} value={context.id}>{roleLabels[context.role]}</option>)}</select></label> : <span className="role-chip">{roleLabels[activeContext.role]}</span>}
      </div>
    </header>
    {deniedSection ? <section className="permission-state" role="alert"><span>권한 없음</span><h1>이 기능을 사용할 권한이 없어요</h1><p>현재 역할에 허용된 화면으로 안전하게 이동했습니다.</p><button className="primary-button" onClick={() => setDeniedSection(null)}>홈으로 돌아가기</button></section> : <section className="role-content">
      {section !== "home" && page && <div className="page-heading"><span>{page.eyebrow}</span><h1>{page.title}</h1><p>{page.description}</p></div>}
      {section === "home" ? (isEmployee ? <EmployeeHome context={activeContext} displayName={displayName} navigate={navigate} /> : <ManagerHome context={activeContext} navigate={navigate} />)
        : section === "schedule" && isEmployee ? <EmployeeSchedule context={activeContext} userContext={userContext} />
        : section === "requests" && isEmployee ? <EmployeeLeave context={activeContext} userContext={userContext} />
        : section === "approvals" ? <ManagerApprovals context={activeContext} userContext={userContext} />
        : section === "attendance" && isEmployee ? <EmployeeAttendance context={activeContext} />
        : section === "attendance" ? <ManagerAttendance context={activeContext} userContext={userContext} />
        : section === "notifications" ? <NotificationInbox context={activeContext} onNavigate={navigate} onUnreadCountChange={setUnreadCount} />
        : section === "more" ? <MoreMenu context={activeContext} items={items} onSignOut={onSignOut} navigate={navigate} />
        : <div className="placeholder-card"><strong>{items.find((item) => item.section === section)?.label}</strong><p>웹 관리 데이터와 같은 권한 범위로 연결되는 보조 관리 화면입니다.</p></div>}
    </section>}
    <nav className={`bottom-nav ${isEmployee ? "employee-nav" : "manager-nav"}`} style={{ "--nav-items": primaryItems.length } as CSSProperties} aria-label="주요 메뉴">
      {primaryItems.map((item) => { const selected = (section === item.section || (isEmployee && section === "notifications" && item.section === "more")) && !deniedSection; return <button key={item.section} className={`${selected ? "active" : ""} ${item.section === "attendance" && isEmployee ? "qr-nav-item" : ""}`} onClick={() => navigate(item.section)} aria-current={selected ? "page" : undefined}>
        {item.section === "attendance" && isEmployee ? <span className="qr-nav-icon"><Icon name="scan" /></span> : <Icon name={sectionIcons[item.section] ?? "menu"} />}
        <span>{item.section === "attendance" && isEmployee ? "QR" : item.label}</span>
      </button>;})}
    </nav>
  </main>;
}
