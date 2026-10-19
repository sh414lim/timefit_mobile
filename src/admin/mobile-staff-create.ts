import type { SupabaseClient } from "@supabase/supabase-js";
import type { PayType } from "./mobile-payroll";

export async function createMobileStaff(client:SupabaseClient,input:{organizationId:string;name:string;phone:string;department:string;categoryId:string;jobTitle:string;joinedOn:string;payType:PayType|null;rate:number|null}){
  const rate=input.rate&&input.rate>0?input.rate:null;
  const {data,error}=await client.rpc("timefit_user_create_manual_staff",{p_organization_id:input.organizationId,p_name:input.name.trim(),p_phone:input.phone,p_department:input.department.trim()||null,p_category_id:input.categoryId||null,p_job_title:input.jobTitle.trim()||null,p_joined_on:input.joinedOn||null,p_pay_type:input.payType,p_hourly_wage:input.payType==="hourly"?rate:null,p_daily_wage:input.payType==="daily"?rate:null,p_monthly_salary:input.payType==="monthly"?rate:null,p_annual_salary:input.payType==="annual"?rate:null});
  if(error)throw error;return data as string;
}
