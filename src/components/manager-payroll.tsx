"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import type {FormEvent} from "react";
import type {UserContext} from "@/auth/user-context";
import {getSupabaseBrowserClient} from "@/auth/supabase";
import {hasAnyManagementPermission,type MobileRoleContext} from "@/authorization/mobile-context";
import {isAuthorizationChangedError,requireFreshManagementAuthorization} from "@/authorization/action-guard";
import {loadMobilePayroll,payrollRate,payTypeLabels,saveMobilePayrollContract,type PayType,type PayrollWorkspace} from "@/admin/mobile-payroll";

const monthKey=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit"}).format(new Date());
const won=(value:number)=>`${Math.round(value).toLocaleString("ko-KR")}원`;

export function ManagerPayroll({context,onAuthorizationChanged}:{context:MobileRoleContext;userContext:UserContext;onAuthorizationChanged:()=>Promise<UserContext|null>}){
  const canManage=hasAnyManagementPermission(context,["payroll.manage"]);const [month,setMonth]=useState(monthKey());const [workspace,setWorkspace]=useState<PayrollWorkspace|null>(null);const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [saving,setSaving]=useState(false);
  const refresh=useCallback(async()=>{setLoading(true);setMessage("");try{setWorkspace(await loadMobilePayroll(getSupabaseBrowserClient(),context.organizationId,month));}catch{setMessage("급여 데이터를 불러오지 못했어요.");}finally{setLoading(false);}},[context.organizationId,month]);
  useEffect(()=>{const timer=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(timer);},[refresh]);
  const groups=useMemo(()=>Object.entries(payTypeLabels).map(([type,label])=>({type:type as PayType,label,staff:(workspace?.staff??[]).filter(item=>item.payType===type)})).filter(group=>group.staff.length),[workspace]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const payType=String(form.get("payType")) as PayType;const rate=Number(form.get("rate"));if(!rate||rate<1)return setMessage("적용 단가를 확인해 주세요.");setSaving(true);setMessage("");try{const client=getSupabaseBrowserClient();await requireFreshManagementAuthorization(client,context.organizationId,["payroll.manage"]);await saveMobilePayrollContract(client,context.organizationId,{staffId:String(form.get("staffId")),payType,rate,effectiveFrom:String(form.get("effectiveFrom")),memo:String(form.get("memo")||"")});setMessage("급여 계약 이력을 저장했어요.");event.currentTarget.reset();await refresh();}catch(error){setMessage(isAuthorizationChangedError(error)?"급여 관리 권한이 변경되어 저장하지 않았어요.":"급여 계약을 저장하지 못했어요.");if(isAuthorizationChangedError(error))await onAuthorizationChanged();}finally{setSaving(false);}}
  if(loading&&!workspace)return <section className="admin-state" aria-busy="true"><div className="spinner"/><h2>급여 정보를 불러오고 있어요</h2></section>;
  return <section className="mobile-admin-page">
    {message&&<p className="admin-message" role="status">{message}</p>}
    <div className="admin-toolbar"><label>정산 월<input type="month" value={month} onChange={event=>setMonth(event.target.value)}/></label><button onClick={()=>void refresh()} disabled={loading}>{loading?"동기화 중…":"새로고침"}</button></div>
    <article className="admin-summary-card"><span>저장된 급여 초안</span><strong>{workspace?.draft?`${workspace.lines.length}명 · ${won(workspace.lines.reduce((sum,line)=>sum+Number(line.estimated_total||0),0))}`:"아직 없음"}</strong><small>{workspace?.draft?`상태 ${workspace.draft.status} · ${new Date(workspace.draft.updated_at).toLocaleString("ko-KR")}`:"웹 또는 모바일에서 급여 초안을 만든 뒤 확인할 수 있어요."}</small></article>
    {groups.map(group=><section className="admin-card" key={group.type}><header><div><span>{group.label}</span><h2>{group.label} 직원</h2></div><strong>{group.staff.length}명</strong></header><div className="admin-list">{group.staff.map(staff=>{const line=workspace?.lines.find(item=>item.staff_id===staff.id);const contract=workspace?.contracts.find(item=>item.staff_id===staff.id&&item.effective_from<=`${month}-31`);return <article key={staff.id}><div><strong>{staff.name}</strong><small>{staff.categoryName??"소속 미지정"}{contract?` · ${won(payrollRate(contract))}`:" · 계약 없음"}</small></div><span>{line?won(Number(line.estimated_total)):"초안 없음"}</span></article>;})}</div></section>)}
    {canManage&&<section className="admin-card"><header><div><span>권한 확인 후 저장</span><h2>급여 계약 이력 추가</h2></div></header><form className="admin-form" onSubmit={submit}><label>직원<select name="staffId" required defaultValue=""><option value="">선택</option>{workspace?.staff.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>급여 형태<select name="payType" required defaultValue="hourly">{Object.entries(payTypeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>적용 단가<input name="rate" type="number" min="1" inputMode="numeric" required/></label><label>적용 시작일<input name="effectiveFrom" type="date" required defaultValue={`${month}-01`}/></label><label>메모<input name="memo" maxLength={200} placeholder="선택"/></label><button className="primary-button" disabled={saving}>{saving?"저장 중…":"계약 저장"}</button></form></section>}
  </section>;
}
