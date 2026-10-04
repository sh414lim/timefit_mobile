"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserContext } from "@/auth/user-context";
import { getSupabaseBrowserClient } from "@/auth/supabase";
import type { MobileRoleContext } from "@/authorization/mobile-context";
import { canEnablePush, enableSchedulePush } from "@/notifications/push";
import { acknowledgeSchedule, addDays, cacheKey, dateKeyInTimeZone, leaveConflictsWithSchedule, leaveCovers, loadMobileScheduleRange, monthRange, scheduleMinutes, startOfWeek, type MobileScheduleRange, type ScheduleItem } from "@/schedule/mobile-schedule";

type ViewMode = "week" | "month";
const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

function shortTime(value: string | null) { return value?.slice(0, 5) ?? ""; }
function duration(minutes: number | null) { return minutes === null ? "" : `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ""}`; }
function monthLabel(key: string) { const [year, month] = key.split("-"); return `${year}년 ${Number(month)}월`; }
function dayLabel(key: string) { return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)); }

export function EmployeeSchedule({ context, userContext }: { context: MobileRoleContext; userContext: UserContext }) {
  const [mode, setMode] = useState<ViewMode>("week");
  const [selected, setSelected] = useState(() => dateKeyInTimeZone(new Date(), "Asia/Seoul"));
  const [anchor, setAnchor] = useState(selected);
  const [schedule, setSchedule] = useState<MobileScheduleRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pushState, setPushState] = useState<"idle"|"saving"|"enabled"|"denied">("idle");
  const scheduleRef = useRef<MobileScheduleRange | null>(null);
  const range = useMemo(() => monthRange(anchor), [anchor]);
  const userId = userContext.profile?.id ?? "anonymous";

  const fetchRange = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError("");
    const key = cacheKey(userId, context.organizationId, range.from, range.to);
    try {
      const result = await loadMobileScheduleRange(getSupabaseBrowserClient(), context.organizationId, range.from, range.to);
      scheduleRef.current = result;
      setSchedule(result);
      window.sessionStorage.setItem(key, JSON.stringify(result));
    } catch {
      if (!scheduleRef.current) setError("스케줄을 불러오지 못했어요.");
      else setError("최신 일정을 확인하지 못했어요.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [context.organizationId, range.from, range.to, userId]);

  useEffect(() => {
    const key = cacheKey(userId, context.organizationId, range.from, range.to);
    const cached = window.sessionStorage.getItem(key);
    const timer = window.setTimeout(() => {
      if (cached) { try { const restored = JSON.parse(cached) as MobileScheduleRange; scheduleRef.current = restored; setSchedule(restored); setLoading(false); } catch { window.sessionStorage.removeItem(key); } }
      void fetchRange(Boolean(cached));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [context.organizationId, fetchRange, range.from, range.to, userId]);

  const days = useMemo(() => {
    const from = mode === "week" ? startOfWeek(selected) : range.from;
    const to = mode === "week" ? addDays(from, 6) : range.to;
    const result: string[] = [];
    for (let day = from; day <= to; day = addDays(day, 1)) result.push(day);
    return result;
  }, [mode, range.from, range.to, selected]);
  const selectedItems = schedule?.items.filter((item) => item.work_date === selected) ?? [];
  const selectedLeaves = schedule?.leaves.filter((leave) => leaveCovers(leave, selected)) ?? [];

  function move(direction: number) {
    const next = addDays(anchor, direction * (mode === "week" ? 7 : 32));
    const normalized = mode === "month" ? `${next.slice(0, 7)}-01` : next;
    setAnchor(normalized); setSelected(normalized);
  }

  async function acknowledge(item: ScheduleItem) {
    try {
      await acknowledgeSchedule(getSupabaseBrowserClient(), item.id, item.schedule_revision);
      const next = schedule ? { ...schedule, items: schedule.items.map((candidate)=>candidate.id===item.id?{...candidate,changed:false,acknowledged_revision:item.schedule_revision}:candidate) } : schedule;
      scheduleRef.current = next;
      setSchedule(next);
    } catch { setError("변경 확인 상태를 저장하지 못했어요."); }
  }

  async function enablePush() {
    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    if (!publicKey) return;
    setPushState("saving");
    try { await enableSchedulePush(getSupabaseBrowserClient(), publicKey); setPushState("enabled"); }
    catch { setPushState("denied"); }
  }

  if (loading && !schedule) return <section className="schedule-state" aria-busy="true"><div className="spinner" /><h2>스케줄을 불러오고 있어요</h2></section>;
  if (error && !schedule) return <section className="schedule-state error"><span>연결 오류</span><h2>{error}</h2><p>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</p><button className="primary-button" onClick={()=>void fetchRange()}>다시 시도</button></section>;

  return <section className="employee-schedule">
    <div className="schedule-toolbar"><button aria-label="이전 기간" onClick={()=>move(-1)}>‹</button><strong>{monthLabel(anchor)}</strong><button aria-label="다음 기간" onClick={()=>move(1)}>›</button></div>
    <div className="schedule-segment" role="tablist"><button role="tab" aria-selected={mode==="week"} onClick={()=>setMode("week")}>주간</button><button role="tab" aria-selected={mode==="month"} onClick={()=>setMode("month")}>월간</button></div>
    {error && <div className="schedule-warning" role="status">{error}<button onClick={()=>void fetchRange(true)}>재시도</button></div>}
    <div className={`schedule-calendar ${mode}`}>
      {mode === "month" && weekdays.map((day)=><span className="weekday" key={day}>{day}</span>)}
      {days.map((day, index) => { const dayItems = schedule?.items.filter((entry)=>entry.work_date===day)??[]; const item = dayItems[0]; const leave = schedule?.leaves.find((entry)=>leaveCovers(entry, day)); const isOutside = mode === "month" && day.slice(0,7)!==anchor.slice(0,7); return <button key={day} className={`${selected===day?"selected ":""}${isOutside?"outside":""}`} onClick={()=>setSelected(day)} aria-label={`${day}${item?.is_day_off?" 휴무":leave?` ${leave.leave_type}`:item?` ${shortTime(item.starts_at)} 근무`:" 일정 없음"}`}><span>{mode === "week" ? weekdays[index] : ""}</span><strong>{Number(day.slice(-2))}</strong>{dayItems.some((entry)=>entry.changed)&&<b className="changed-dot">변경</b>}{item?.is_day_off ? <i className="off">휴무</i> : leave ? <i className="leave">{leave.leave_type}</i> : item ? <i>{shortTime(item.starts_at)}{dayItems.length>1?` 외 ${dayItems.length-1}`:""}</i> : <i className="empty">·</i>}</button>; })}
    </div>
    <article className="day-detail"><div className="day-detail-heading"><div><span>선택한 날짜</span><h2>{dayLabel(selected)}</h2></div><button onClick={()=>void fetchRange(true)} disabled={refreshing}>{refreshing?"동기화 중…":"새로고침"}</button></div>
      {selectedLeaves.map((leave)=>{ const conflict=selectedItems.some((item)=>leaveConflictsWithSchedule(leave,item)); return <div className="event-card leave-event" key={leave.id}><span>승인된 휴가</span><strong>{leave.leave_type} · {leave.day_part==="am"?"오전 반차":leave.day_part==="pm"?"오후 반차":"종일"}</strong><p>{leave.amount}일 · {leave.starts_on}{leave.ends_on!==leave.starts_on?` ~ ${leave.ends_on}`:""}</p>{conflict&&<em className="conflict-note">근무 일정과 시간이 겹쳐요. 관리자에게 확인해 주세요.</em>}</div>;})}
      {selectedItems.map((item)=><div className={`event-card ${item.is_day_off?"day-off":""} ${item.changed?"changed-event":""}`} key={item.id}>{item.is_day_off?<><span>확정 일정</span><strong>휴무</strong><p>근무가 없는 휴무일이에요.</p></>:<><span>{item.shift_name}{item.changed&&" · 변경됨"}</span><strong>{shortTime(item.starts_at)} – {shortTime(item.ends_at)}</strong><p>휴게 {item.break_minutes}분 · 예정 근무 {duration(scheduleMinutes(item))}</p>{item.changed&&item.previous&&<div className="change-summary">이전 {item.previous.is_day_off?"휴무":`${shortTime(item.previous.starts_at)} – ${shortTime(item.previous.ends_at)}`} → 현재 {shortTime(item.starts_at)} – {shortTime(item.ends_at)}</div>}<small>마지막 변경 {new Intl.DateTimeFormat("ko-KR", { dateStyle:"short", timeStyle:"short", timeZone:schedule?.timezone??"Asia/Seoul" }).format(new Date(item.updated_at))}</small>{item.changed&&<button className="ack-button" onClick={()=>void acknowledge(item)}>변경 확인</button>}</>}</div>)}
      {!selectedItems.length&&!selectedLeaves.length&&<div className="empty-day"><strong>등록된 일정이 없어요</strong><p>휴무로 확정된 날짜는 ‘휴무’로 별도 표시됩니다.</p></div>}
    </article>
    {typeof window!=="undefined"&&canEnablePush(process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY)&&<div className="push-opt-in"><div><strong>일정 변경 알림</strong><span>{pushState==="enabled"?"이 기기에서 알림을 받을게요.":pushState==="denied"?"브라우저 알림 권한을 확인해 주세요.":"확정·변경된 일정을 바로 알려드려요."}</span></div><button onClick={()=>void enablePush()} disabled={pushState==="saving"||pushState==="enabled"}>{pushState==="saving"?"설정 중":pushState==="enabled"?"설정됨":"알림 받기"}</button></div>}
    {schedule && <p className="schedule-sync">사업장 시간대 {schedule.timezone} · 마지막 동기화 {new Intl.DateTimeFormat("ko-KR",{hour:"2-digit",minute:"2-digit",timeZone:schedule.timezone}).format(new Date(schedule.serverTime))}</p>}
  </section>;
}
