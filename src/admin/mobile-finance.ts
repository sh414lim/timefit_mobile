import type { SupabaseClient } from "@supabase/supabase-js";

export type FinanceDocument={id:string;title:string;file_name:string;document_date:string|null;memo:string|null;external_url:string|null;review_status:string|null;created_at:string};

export async function loadMobileFinanceDocuments(client:SupabaseClient,organizationId:string):Promise<FinanceDocument[]>{
  const {data,error}=await client.from("timefit_user_finance_documents").select("id,title,file_name,document_date,memo,external_url,review_status,created_at").eq("organization_id",organizationId).eq("document_type","receipt").order("created_at",{ascending:false}).limit(100);
  if(error)throw error;return (data??[]) as FinanceDocument[];
}

export async function uploadMobileReceiptToDrive(client:SupabaseClient,input:{organizationId:string;file:File;documentDate:string;memo:string}){
  if(!input.file.size)throw new Error("영수증 파일을 선택해 주세요.");
  if(input.file.size>20*1024*1024)throw new Error("파일은 20MB 이하만 업로드할 수 있어요.");
  if(!(input.file.type.startsWith("image/")||input.file.type==="application/pdf"))throw new Error("이미지 또는 PDF 파일만 업로드할 수 있어요.");
  const body=new FormData();body.set("organizationId",input.organizationId);body.set("file",input.file,input.file.name);
  const {data:drive,error:driveError}=await client.functions.invoke("upload-receipt-drive",{body});
  if(driveError){const detail=await driveError.context?.json?.().catch(()=>null);throw new Error(detail?.error||driveError.message||"Google Drive 업로드에 실패했습니다.");}
  if(!drive?.file?.id||!drive.file.webViewLink)throw new Error("Google Drive 파일 URL을 받지 못했습니다.");
  const user=(await client.auth.getUser()).data.user;
  const {data,error}=await client.from("timefit_user_finance_documents").insert({organization_id:input.organizationId,document_type:"receipt",title:`${input.documentDate} 영수증`,file_name:input.file.name,storage_path:null,storage_provider:"google_drive",external_file_id:drive.file.id,external_url:drive.file.webViewLink,mime_type:input.file.type||null,file_size:input.file.size,document_date:input.documentDate,memo:input.memo.trim()||null,uploaded_by:user?.id??null,review_status:"submitted",processing_status:"uploaded",submitted_at:new Date().toISOString(),page_count:1,capture_metadata:{source:"manager_mobile",ocr:false}}).select("id,title,file_name,document_date,memo,external_url,review_status,created_at").single();
  if(error)throw error;return data as FinanceDocument;
}
