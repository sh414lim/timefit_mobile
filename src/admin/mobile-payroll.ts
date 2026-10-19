import type { SupabaseClient } from "@supabase/supabase-js";

export type PayType = "hourly" | "daily" | "monthly" | "annual";
export type PayrollStaff = { id:string; name:string; payType:PayType; categoryName:string|null };
export type PayrollContract = { id:string; staff_id:string; pay_type:PayType; hourly_wage:number|null; daily_wage:number|null; monthly_salary:number|null; annual_salary:number|null; effective_from:string; memo:string|null };
export type PayrollLine = { id:string; staff_id:string; pay_type:PayType; worked_minutes:number; completed_work_days:number; approved_leave_days:number; estimated_total:number };
export type PayrollWorkspace = { staff:PayrollStaff[]; contracts:PayrollContract[]; lines:PayrollLine[]; draft:{ id:string; status:string; updated_at:string }|null };

export async function loadMobilePayroll(client:SupabaseClient,organizationId:string,month:string):Promise<PayrollWorkspace>{
  const settlementMonth=`${month}-01`;
  const [staffResult,contractsResult,draftResult]=await Promise.all([
    client.from("timefit_user_staff").select("id,display_name,pay_type,department,category:timefit_user_staff_categories(name)").eq("organization_id",organizationId).eq("worker_type","regular").is("archived_at",null).order("sort_order"),
    client.from("timefit_user_payroll_contracts").select("id,staff_id,pay_type,hourly_wage,daily_wage,monthly_salary,annual_salary,effective_from,memo").eq("organization_id",organizationId).order("effective_from",{ascending:false}),
    client.from("timefit_user_payroll_drafts").select("id,status,updated_at").eq("organization_id",organizationId).eq("settlement_month",settlementMonth).maybeSingle()
  ]);
  if(staffResult.error)throw staffResult.error;if(contractsResult.error)throw contractsResult.error;if(draftResult.error)throw draftResult.error;
  const linesResult=draftResult.data?await client.from("timefit_user_payroll_draft_lines").select("id,staff_id,pay_type,worked_minutes,completed_work_days,approved_leave_days,estimated_total").eq("payroll_draft_id",draftResult.data.id).order("created_at"):{data:[],error:null};
  if(linesResult.error)throw linesResult.error;
  return {
    staff:(staffResult.data??[]).map((item)=>{const category=Array.isArray(item.category)?item.category[0]:item.category;return {id:item.id,name:item.display_name||"직원",payType:item.pay_type as PayType,categoryName:category?.name??item.department??null};}),
    contracts:(contractsResult.data??[]) as PayrollContract[],lines:(linesResult.data??[]) as PayrollLine[],draft:draftResult.data
  };
}

export async function saveMobilePayrollContract(client:SupabaseClient,organizationId:string,input:{staffId:string;payType:PayType;rate:number;effectiveFrom:string;memo:string}){
  const user=(await client.auth.getUser()).data.user;
  const payload={organization_id:organizationId,staff_id:input.staffId,pay_type:input.payType,hourly_wage:input.payType==="hourly"?input.rate:null,daily_wage:input.payType==="daily"?input.rate:null,monthly_salary:input.payType==="monthly"?input.rate:null,annual_salary:input.payType==="annual"?input.rate:null,effective_from:input.effectiveFrom,memo:input.memo.trim()||null,created_by:user?.id??null};
  const {data,error}=await client.from("timefit_user_payroll_contracts").insert(payload).select().single();if(error)throw error;return data;
}

export function payrollRate(contract:PayrollContract){return Number(contract.hourly_wage??contract.daily_wage??contract.monthly_salary??contract.annual_salary??0);}
export const payTypeLabels:Record<PayType,string>={hourly:"시급제",daily:"일급제",monthly:"월급제",annual:"연봉제"};
