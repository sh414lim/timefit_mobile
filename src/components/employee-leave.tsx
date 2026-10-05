"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import type {UserContext} from "@/auth/user-context";
import {getSupabaseBrowserClient} from "@/auth/supabase";
import type {MobileRoleContext} from "@/authorization/mobile-context";
import {cancelLeave,dayPartLabel,leaveCacheKey,leaveDraftKey,leaveStatusLabel,loadLeaveSummary,submitLeave,validateLeaveDraft,type LeaveDayPart,type LeaveSummary} from "@/leave/mobile-leave";
import {dateKeyInTimeZone} from "@/schedule/mobile-schedule";
import {reportNetworkFailure,reportNetworkSuccess} from "@/network/connectivity";
import {classifyRequestFailure,isAmbiguousWriteFailure,isBrowserOnline,withRequestTimeout} from "@/network/request-policy";
import {useUpdateSafetyBlocker} from "@/pwa/update-safety";

function errorMessage(error:unknown){
  const message=String((error as {message?:string})?.message??"");
  if(message.includes("insufficient_leave_balance")) return "신청 가능한 휴가 잔여일이 부족해요.";
  if(message.includes("leave_request_overlap")) return "같은 기간에 처리 중이거나 승인된 휴가가 있어요.";
  if(message.includes("non_working_day")) return "정기휴일 또는 공휴일만 포함된 신청은 저장할 수 없어요.";
  if(message.includes("leave_date_in_past")) return "오늘 이전 날짜는 신청할 수 없어요.";
  if(message.includes("leave_request_not_cancellable")) return "승인 대기 중인 신청만 취소할 수 있어요.";
  return "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}
function dateLabel(from:string,to:string){return from===to?from:`${from} ~ ${to}`;}

export function EmployeeLeave({context,userContext}:{context:MobileRoleContext;userContext:UserContext}){
  const userId=userContext.profile?.id??"anonymous";
  const cache=leaveCacheKey(userId,context.organizationId);
  const draftCache=leaveDraftKey(userId,context.organizationId);
  const [summary,setSummary]=useState<LeaveSummary|null>(null);
  const summaryRef=useRef<LeaveSummary|null>(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [formOpen,setFormOpen]=useState(false);
  const [confirming,setConfirming]=useState(false);
  const [saving,setSaving]=useState(false);
  const [startsOn,setStartsOn]=useState("");
  const [endsOn,setEndsOn]=useState("");
  const [dayPart,setDayPart]=useState<LeaveDayPart>("full");
  const [reason,setReason]=useState("");
  const [requestKey,setRequestKey]=useState(()=>crypto.randomUUID());
  const [retrySubmit,setRetrySubmit]=useState(false);
  const [cancelling,setCancelling]=useState(false);
  const cancelKeys=useRef(new Map<string,string>());
  const today=useMemo(()=>dateKeyInTimeZone(new Date(),summary?.timezone??"Asia/Seoul"),[summary?.timezone]);
  useUpdateSafetyBlocker("leave-write","휴가 신청을 저장하거나 복구 중이에요",saving||retrySubmit||cancelling);

  const refresh=useCallback(async(background=false)=>{
    if(background) setRefreshing(true); else setLoading(true); setError("");
    try{const next=await withRequestTimeout(loadLeaveSummary(getSupabaseBrowserClient(),context.organizationId));summaryRef.current=next;setSummary(next);window.sessionStorage.setItem(cache,JSON.stringify(next));reportNetworkSuccess(next.serverTime);return next;}
    catch(nextError){const failure=classifyRequestFailure(nextError,isBrowserOnline());if(isAmbiguousWriteFailure(failure))reportNetworkFailure(failure==="offline"?"offline":"degraded");else reportNetworkSuccess();setError(summaryRef.current?"최신 휴가 내역을 확인하지 못했어요.":"휴가 정보를 불러오지 못했어요.");return null;}
    finally{setLoading(false);setRefreshing(false);}
  },[cache,context.organizationId]);

  useEffect(()=>{const cached=window.sessionStorage.getItem(cache);const draft=window.sessionStorage.getItem(draftCache);const timer=window.setTimeout(()=>{if(cached){try{const restored=JSON.parse(cached) as LeaveSummary;summaryRef.current=restored;setSummary(restored);setLoading(false);}catch{window.sessionStorage.removeItem(cache);}}if(draft){try{const restored=JSON.parse(draft) as {startsOn:string;endsOn:string;dayPart:LeaveDayPart;reason:string;requestKey:string};setStartsOn(restored.startsOn);setEndsOn(restored.endsOn);setDayPart(restored.dayPart);setReason(restored.reason);setRequestKey(restored.requestKey);setRetrySubmit(true);}catch{window.sessionStorage.removeItem(draftCache);}}void refresh(Boolean(cached));},0);return()=>window.clearTimeout(timer);},[cache,draftCache,refresh]);

  useEffect(()=>{if(!formOpen&&!retrySubmit)return;window.sessionStorage.setItem(draftCache,JSON.stringify({startsOn,endsOn,dayPart,reason,requestKey}));},[dayPart,draftCache,endsOn,formOpen,reason,requestKey,retrySubmit,startsOn]);

  function prepareSubmit(){const validation=validateLeaveDraft(startsOn,endsOn,dayPart,reason,today);if(validation){setError(validation);return;}setError("");setConfirming(true);}
  async function save(){if(navigator.onLine===false){reportNetworkFailure("offline");setRetrySubmit(true);setError("오프라인에서는 휴가를 제출할 수 없어요. 연결 후 다시 시도해 주세요.");return;}setSaving(true);setError("");try{const result=await withRequestTimeout(submitLeave(getSupabaseBrowserClient(),context.organizationId,{startsOn,endsOn,dayPart,reason,requestKey}));reportNetworkSuccess();setRetrySubmit(false);window.sessionStorage.removeItem(draftCache);setNotice(result.schedule_conflicts?`신청했어요. 확정 근무 ${result.schedule_conflicts}건과 겹쳐 관리자 확인이 필요해요.`:"휴가 신청을 서버에 저장했어요.");setConfirming(false);setFormOpen(false);setStartsOn("");setEndsOn("");setDayPart("full");setReason("");setRequestKey(crypto.randomUUID());await refresh(true);}catch(nextError){const failure=classifyRequestFailure(nextError,isBrowserOnline());if(isAmbiguousWriteFailure(failure)){reportNetworkFailure(failure==="offline"?"offline":"degraded");setRetrySubmit(true);setError("저장 결과를 확인하지 못했어요. 연결 후 같은 신청을 다시 확인해 주세요.");}else{reportNetworkSuccess();setError(errorMessage(nextError));}}finally{setSaving(false);}}
  async function cancel(id:string){if(navigator.onLine===false){reportNetworkFailure("offline");setError("오프라인에서는 신청을 취소할 수 없어요.");return;}setError("");setCancelling(true);const key=cancelKeys.current.get(id)??crypto.randomUUID();cancelKeys.current.set(id,key);try{await withRequestTimeout(cancelLeave(getSupabaseBrowserClient(),context.organizationId,id,key));reportNetworkSuccess();cancelKeys.current.delete(id);setNotice("휴가 신청 취소를 서버에서 확인했어요.");await refresh(true);}catch(nextError){const failure=classifyRequestFailure(nextError,isBrowserOnline());if(isAmbiguousWriteFailure(failure))reportNetworkFailure(failure==="offline"?"offline":"degraded");else reportNetworkSuccess();setError(isAmbiguousWriteFailure(failure)?"취소 결과를 확인하지 못했어요. 연결 후 같은 요청을 다시 시도해 주세요.":errorMessage(nextError));}finally{setCancelling(false);}}

  if(loading&&!summary)return <section className="leave-state" aria-busy="true"><div className="spinner"/><h2>휴가 정보를 불러오고 있어요</h2></section>;
  if(error&&!summary)return <section className="leave-state error"><span>연결 오류</span><h2>{error}</h2><button className="primary-button" onClick={()=>void refresh()}>다시 시도</button></section>;
  return <section className="employee-leave">
    <div className="leave-balance-grid"><article className="leave-balance primary"><span>신청 가능 예상</span><strong>{summary?.available??0}<small>일</small></strong><p>승인 대기까지 반영한 수치예요.</p></article><article><span>현재 잔여</span><strong>{summary?.remaining??0}<small>일</small></strong><p>발생 {summary?.granted??0} · 사용 {summary?.approved??0}</p></article><article><span>승인 대기</span><strong>{summary?.pending??0}<small>일</small></strong><p>관리자 처리 전이에요.</p></article></div>
    <button className="primary-button leave-create" onClick={()=>{setFormOpen(true);setNotice("");setError("");}}>휴가 신청하기</button>
    {retrySubmit&&startsOn&&<div className="request-recovery" role="alert"><span>작성 중이거나 저장 확인이 필요한 휴가 신청이 있어요.</span><button onClick={()=>{setFormOpen(true);setConfirming(true);}}>신청 확인</button></div>}
    {notice&&<div className="leave-notice" role="status">{notice}</div>}{error&&<div className="leave-error" role="alert">{error}<button onClick={()=>setError("")}>닫기</button></div>}
    <div className="leave-list-heading"><div><span>최근 신청</span><h2>내 휴가 내역</h2></div><button onClick={()=>void refresh(true)} disabled={refreshing}>{refreshing?"동기화 중…":"새로고침"}</button></div>
    <div className="leave-list">{summary?.requests.length?summary.requests.map(request=><article key={request.id}><div className="leave-row-top"><span className={`leave-status ${request.status}`}>{leaveStatusLabel[request.status]}</span><time>{new Intl.DateTimeFormat("ko-KR",{dateStyle:"short",timeZone:summary.timezone}).format(new Date(request.created_at))}</time></div><strong>{dayPartLabel[request.day_part]} · {request.amount}일</strong><p>{dateLabel(request.starts_on,request.ends_on)}</p>{request.reason&&<small>사유 · {request.reason}</small>}{request.review_comment&&<div className="review-comment">관리자 의견 · {request.review_comment}</div>}{request.status==="pending"&&<button className="cancel-request" onClick={()=>void cancel(request.id)}>신청 취소</button>}</article>):<div className="empty-leave"><strong>신청 내역이 없어요</strong><p>필요한 날짜를 선택해 첫 휴가를 신청해 보세요.</p></div>}</div>
    {summary&&<p className="leave-sync">사업장 시간대 {summary.timezone} · 마지막 동기화 {new Intl.DateTimeFormat("ko-KR",{hour:"2-digit",minute:"2-digit",timeZone:summary.timezone}).format(new Date(summary.serverTime))}</p>}
    {formOpen&&<div className="leave-modal" role="dialog" aria-modal="true" aria-label="휴가 신청"><div className="leave-modal-card"><div className="leave-modal-heading"><div><span>MOB-06</span><h2>휴가 신청</h2></div><button aria-label="닫기" onClick={()=>{setFormOpen(false);setConfirming(false);}}>×</button></div>{confirming?<div className="leave-confirm"><span>신청 내용을 확인해 주세요</span><strong>{dayPartLabel[dayPart]}</strong><p>{dateLabel(startsOn,endsOn)}</p><p>최종 차감 일수는 사업장 휴일 정책을 적용해 서버에서 계산합니다.</p><div><button className="secondary-button" onClick={()=>setConfirming(false)}>수정</button><button className="primary-button" disabled={saving} onClick={()=>void save()}>{saving?"저장 중…":"신청 완료"}</button></div></div>:<form onSubmit={event=>{event.preventDefault();prepareSubmit();}}><fieldset><legend>휴가 종류</legend><div className="leave-type-grid">{(["full","am","pm"] as LeaveDayPart[]).map(part=><button type="button" key={part} className={dayPart===part?"selected":""} onClick={()=>{setDayPart(part);if(part!=="full"&&startsOn)setEndsOn(startsOn);}}>{dayPartLabel[part]}<small>{part==="full"?"1일 이상":"0.5일"}</small></button>)}</div></fieldset><div className="leave-date-grid"><label>시작일<input type="date" min={today} value={startsOn} onChange={event=>{setStartsOn(event.target.value);if(dayPart!=="full"||!endsOn)setEndsOn(event.target.value);}} required/></label><label>종료일<input type="date" min={startsOn||today} value={endsOn} disabled={dayPart!=="full"} onChange={event=>setEndsOn(event.target.value)} required/></label></div><label>사유 <small>선택 · {reason.length}/500</small><textarea maxLength={500} value={reason} onChange={event=>setReason(event.target.value)} placeholder="관리자가 확인할 내용을 입력해 주세요."/></label><button className="primary-button" type="submit">신청 내용 확인</button></form>}</div></div>}
  </section>;
}
