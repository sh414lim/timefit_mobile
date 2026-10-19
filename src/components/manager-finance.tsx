"use client";

import {useCallback,useEffect,useState,type FormEvent} from "react";
import type {UserContext} from "@/auth/user-context";
import {getSupabaseBrowserClient} from "@/auth/supabase";
import type {MobileRoleContext} from "@/authorization/mobile-context";
import {isAuthorizationChangedError,requireFreshManagementAuthorization} from "@/authorization/action-guard";
import {loadMobileFinanceDocuments,uploadMobileReceiptToDrive,type FinanceDocument} from "@/admin/mobile-finance";

const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul"}).format(new Date());
const statusLabel=(value:string|null)=>value==="approved"?"승인 완료":value==="change_requested"?"수정 필요":"검토 대기";

export function ManagerFinance({context,onAuthorizationChanged}:{context:MobileRoleContext;userContext:UserContext;onAuthorizationChanged:()=>Promise<UserContext|null>}){
  const [documents,setDocuments]=useState<FinanceDocument[]>([]);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
  const refresh=useCallback(async()=>{setLoading(true);try{setDocuments(await loadMobileFinanceDocuments(getSupabaseBrowserClient(),context.organizationId));}catch{setMessage("지출 증빙을 불러오지 못했어요.");}finally{setLoading(false);}},[context.organizationId]);
  useEffect(()=>{const timer=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(timer);},[refresh]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const formElement=event.currentTarget;const form=new FormData(formElement);const file=form.get("receipt");if(!(file instanceof File)||!file.size)return setMessage("영수증을 촬영하거나 선택해 주세요.");setSaving(true);setMessage("Google Drive에 원본을 저장하고 있어요.");try{const client=getSupabaseBrowserClient();await requireFreshManagementAuthorization(client,context.organizationId,["expense.manage","expense.receipt.review"]);await uploadMobileReceiptToDrive(client,{organizationId:context.organizationId,file,documentDate:String(form.get("documentDate")),memo:String(form.get("memo")||"")});formElement.reset();setMessage("원본과 Drive URL을 지출 증빙에 저장했어요.");await refresh();}catch(error){setMessage(isAuthorizationChangedError(error)?"지출 증빙 권한이 변경되어 저장하지 않았어요.":String((error as Error)?.message||"영수증을 저장하지 못했어요."));if(isAuthorizationChangedError(error))await onAuthorizationChanged();}finally{setSaving(false);}}
  return <section className="mobile-admin-page">
    {message&&<p className="admin-message" role="status">{message}</p>}
    <section className="admin-card"><header><div><span>OCR 없이 원본 보관</span><h2>영수증 업로드</h2></div></header><form className="admin-form" onSubmit={submit}><label className="admin-file">영수증 촬영·선택<input name="receipt" type="file" accept="image/*,application/pdf" capture="environment" required/><small>이미지 또는 PDF · 최대 20MB</small></label><label>사용일<input name="documentDate" type="date" required defaultValue={today()}/></label><label>지출 메모<input name="memo" maxLength={200} placeholder="예: 주방 식자재 구입"/></label><button className="primary-button" disabled={saving}>{saving?"저장 중…":"Drive에 저장"}</button></form></section>
    <section className="admin-card"><header><div><span>Google Drive 원본</span><h2>최근 지출 증빙</h2></div><button onClick={()=>void refresh()} disabled={loading}>{loading?"동기화 중…":"새로고침"}</button></header><div className="admin-list">{documents.length?documents.map(item=><article key={item.id}><div><strong>{item.title}</strong><small>{item.file_name} · {new Date(item.created_at).toLocaleDateString("ko-KR")}</small></div>{item.external_url?<a href={item.external_url} target="_blank" rel="noreferrer">원본 열기</a>:<span>{statusLabel(item.review_status)}</span>}</article>):<div className="admin-empty">등록된 영수증이 없어요.</div>}</div></section>
  </section>;
}
