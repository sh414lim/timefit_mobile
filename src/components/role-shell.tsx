"use client";

import { useEffect, useMemo, useState } from "react";
import { clearPrivateBrowserData } from "@/auth/session-storage";
import type { UserContext } from "@/auth/user-context";
import { EmployeeSchedule } from "@/components/employee-schedule";
import { EmployeeLeave } from "@/components/employee-leave";
import { ManagerApprovals } from "@/components/manager-approvals";
import { ManagerAttendance } from "@/components/manager-attendance";
import { EmployeeAttendance } from "@/components/employee-attendance";
import { NetworkBanner } from "@/components/network-banner";
import { NotificationInbox } from "@/components/notification-inbox";
import { canAccessSection, deriveMobileContexts, roleLabels, visibleNavigation, type MobileRoleContext, type MobileSection } from "@/authorization/mobile-context";
import { getSupabaseBrowserClient } from "@/auth/supabase";
import { canEnablePush, enableSchedulePush } from "@/notifications/push";

const ACTIVE_CONTEXT_KEY = "timefit:active-context";

const homeCopy = {
  employee: ["오늘 근무", "출퇴근 상태", "내 요청", "다음 근무"],
  sub_manager: ["담당 직원 현황", "승인 대기", "스케줄 변경", "운영 알림"],
  operations_lead: ["전체 운영 현황", "승인 대기", "근태 예외", "스케줄 변경"],
  owner: ["사업장 운영 현황", "승인 대기", "매출·재무 권한", "주요 알림"]
} as const;

function initialContext(contexts: MobileRoleContext[]): MobileRoleContext | null {
  return contexts[0] ?? null;
}

export function RoleShell({ userContext, onSignOut }: { userContext: UserContext; onSignOut: () => Promise<void> }) {
  const contexts = useMemo(() => deriveMobileContexts(userContext), [userContext]);
  const [activeContext, setActiveContext] = useState<MobileRoleContext | null>(() => initialContext(contexts));
  const [section, setSection] = useState<MobileSection>("home");
  const [deniedSection, setDeniedSection] = useState<string | null>(null);

  const items = activeContext ? visibleNavigation(activeContext) : [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(ACTIVE_CONTEXT_KEY);
      const restored = contexts.find((context) => context.id === stored);
      if (restored) setActiveContext(restored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [contexts]);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    if (!publicKey || !canEnablePush(publicKey) || Notification.permission !== "granted") return;
    void enableSchedulePush(getSupabaseBrowserClient(), publicKey).catch(() => undefined);
  }, [userContext.profile?.id]);

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
  return <main className="mobile-shell">
    <NetworkBanner />
    <header className="mobile-header"><div><span>{activeContext.organizationName}</span><strong>{displayName}님</strong></div>{contexts.length > 1 ? <label className="context-select"><span className="sr-only">활성 역할</span><select aria-label="활성 역할" value={activeContext.id} onChange={(event)=>switchContext(event.target.value)}>{contexts.map((context)=><option key={context.id} value={context.id}>{roleLabels[context.role]}</option>)}</select></label> : <span className="role-chip">{roleLabels[activeContext.role]}</span>}</header>
    {deniedSection ? <section className="permission-state" role="alert"><span>권한 없음</span><h1>이 기능을 사용할 권한이 없어요</h1><p>현재 역할에 허용된 화면으로 안전하게 이동했습니다.</p><button className="primary-button" onClick={()=>setDeniedSection(null)}>홈으로 돌아가기</button></section> : <section className="role-content"><span className="eyebrow blue">{section === "schedule" && activeContext.role === "employee" ? "MOB-05 · 내 일정" : section === "requests" && activeContext.role === "employee" ? "MOB-06 · 휴가·연차" : section === "attendance" && activeContext.role === "employee" ? "QR 출퇴근" : section === "approvals" ? "MOB-07 · 관리자 승인함" : section === "notifications" ? "ALT-01 · 알림" : section === "attendance" && activeContext.role !== "employee" ? "MOB-08 · 관리자 근태" : `MOB-04 · ${roleLabels[activeContext.role]} 모드`}</span><h1>{section === "home" ? `${roleLabels[activeContext.role]} 홈` : section === "requests"&&activeContext.role === "employee" ? "휴가·연차" : items.find((item)=>item.section===section)?.label}</h1><p className="role-description">서버에서 확인된 사업장·역할·권한 범위만 표시합니다.</p>{section === "home" ? <div className="role-grid">{homeCopy[activeContext.role].map((label,index)=><article key={label}><span>{index+1}</span><strong>{label}</strong><p>후속 기능 티켓에서 실제 데이터를 연결합니다.</p></article>)}</div> : section === "notifications" ? <NotificationInbox context={activeContext} onNavigate={navigate}/> : section === "schedule" && activeContext.role === "employee" ? <EmployeeSchedule context={activeContext} userContext={userContext} /> : section === "requests" && activeContext.role === "employee" ? <EmployeeLeave context={activeContext} userContext={userContext} /> : section === "approvals" ? <ManagerApprovals context={activeContext} userContext={userContext} /> : section === "attendance" && activeContext.role === "employee" ? <EmployeeAttendance context={activeContext} /> : section === "attendance" && activeContext.role !== "employee" ? <ManagerAttendance context={activeContext} userContext={userContext} /> : <div className="placeholder-card"><strong>{items.find((item)=>item.section===section)?.label}</strong><p>권한 확인이 완료되었습니다. 상세 기능은 연결되는 후속 티켓에서 제공합니다.</p></div>}</section>}
    <nav className="bottom-nav" aria-label="주요 메뉴">{items.map((item)=><button key={item.section} className={section===item.section&&!deniedSection?"active":""} onClick={()=>navigate(item.section)} aria-current={section===item.section&&!deniedSection?"page":undefined}><span aria-hidden="true">{item.section === "home" ? "●" : "○"}</span>{item.label}</button>)}</nav>
  </main>;
}
