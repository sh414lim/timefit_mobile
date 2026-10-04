"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import type {UserContext} from "@/auth/user-context";
import {getSupabaseBrowserClient} from "@/auth/supabase";
import type {MobileRoleContext} from "@/authorization/mobile-context";
import {attendanceCacheKey,formatClock,loadManagerAttendance,type AttendanceDashboard,type AttendanceStatus} from "@/attendance/manager-attendance";

const labels:Record<AttendanceStatus,string>={working:"근무 중",completed:"퇴근 완료",missing:"미기록",scheduled:"출근 예정"};
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export function ManagerAttendance({context,userContext}:{context:MobileRoleContext;userContext:UserContext}){
 const [date,setDate]=useState(today); const [data,setData]=useState<AttendanceDashboard|null>(null); const dataRef=useRef<AttendanceDashboard|null>(null);
 const [filter,setFilter]=useState<"all"|AttendanceStatus>("all"); const [loading,setLoading]=useState(true); const [refreshing,setRefreshing]=useState(false); const [error,setError]=useState("");
 const cache=attendanceCacheKey(userContext.profile?.id??"manager",context.organizationId,date);
 const refresh=useCallback(async(background=false)=>{if(background)setRefreshing(true);else setLoading(true);setError("");try{const next=await loadManagerAttendance(getSupabaseBrowserClient(),context.organizationId,date);dataRef.current=next;setData(next);window.sessionStorage.setItem(cache,JSON.stringify(next));}catch{setError(dataRef.current?"최신 근태 현황을 확인하지 못했어요.":"근태 현황을 불러오지 못했어요.");}finally{setLoading(false);setRefreshing(false);}},[cache,context.organizationId,date]);
 useEffect(()=>{const timer=window.setTimeout(()=>{dataRef.current=null;setData(null);const cached=window.sessionStorage.getItem(cache);if(cached)try{const restored=JSON.parse(cached) as AttendanceDashboard;dataRef.current=restored;setData(restored);setLoading(false);}catch{window.sessionStorage.removeItem(cache);}void refresh(Boolean(cached));},0);return()=>window.clearTimeout(timer);},[cache,refresh]);
 const rows=useMemo(()=>data?.rows.filter(row=>filter==="all"||row.status===filter)??[],[data?.rows,filter]);
 if(loading&&!data)return <section className="attendance-state" aria-busy="true"><div className="spinner"/><h2>근태 현황을 불러오고 있어요</h2></section>;
 if(error&&!data)return <section className="attendance-state error"><span>연결 오류</span><h2>{error}</h2><button className="primary-button" onClick={()=>void refresh()}>다시 시도</button></section>;
 return <section className="manager-attendance"><div className="attendance-date"><label>조회 날짜<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><button onClick={()=>void refresh(true)} disabled={refreshing}>{refreshing?"동기화 중…":"새로고침"}</button></div>
 <div className="attendance-summary">{(["working","completed","missing","scheduled"] as AttendanceStatus[]).map(status=><button key={status} className={filter===status?"active":""} onClick={()=>setFilter(filter===status?"all":status)}><span>{labels[status]}</span><strong>{data?.counts[status]??0}<small>명</small></strong></button>)}</div>
 {error&&<div className="attendance-error" role="alert">{error}<button onClick={()=>setError("")}>닫기</button></div>}
 <div className="attendance-list-heading"><div><span>{filter==="all"?"전체":labels[filter]}</span><h2>직원 근태 현황</h2></div><strong>{rows.length}명</strong></div>
 <div className="manager-attendance-list">{rows.length?rows.map(row=><article key={row.id}><div className="attendance-person"><span className={`attendance-dot ${row.status}`}/><div><strong>{row.staff_name}</strong><small>{row.category_name??"소속 미지정"} · {row.job_title??"직원"}</small></div><em className={row.status}>{labels[row.status]}</em></div><div className="attendance-times"><span>예정 <b>{row.scheduled_start?.slice(0,5)??"—"} ~ {row.scheduled_end?.slice(0,5)??"—"}</b></span><span>출근 <b>{formatClock(row.checked_in_at,data?.timezone??"Asia/Seoul")}</b></span><span>퇴근 <b>{formatClock(row.checked_out_at,data?.timezone??"Asia/Seoul")}</b></span></div>{row.late&&<p className="attendance-warning">예정 시각보다 늦게 출근했어요.</p>}</article>):<div className="attendance-empty"><strong>해당 상태의 직원이 없어요</strong><p>다른 날짜나 상태를 선택해 주세요.</p></div>}</div>
 {data&&<p className="attendance-sync">사업장 시간대 {data.timezone} · 마지막 동기화 {formatClock(data.serverTime,data.timezone)}</p>}</section>;
}
