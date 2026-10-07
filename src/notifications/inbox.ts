import type {SupabaseClient} from "@supabase/supabase-js";
export type NotificationItem={id:string;notification_type:string;title:string;body:string;deeplink_path:string;metadata:Record<string,unknown>;created_at:string;read_at:string|null};
export type NotificationInbox={items:NotificationItem[];unreadCount:number;serverTime:string};
export async function loadNotifications(client:SupabaseClient,organizationId:string){const{data,error}=await client.rpc("timefit_user_mobile_notifications",{p_organization_id:organizationId,p_limit:50});if(error)throw error;return data as NotificationInbox;}
export async function readNotification(client:SupabaseClient,id:string){const{data,error}=await client.rpc("timefit_user_mobile_read_notification",{p_notification_id:id});if(error)throw error;return String(data||"/#notifications");}
export function safeNotificationPath(path:string){return /^\/#(notifications|schedule|attendance|requests|approvals)(?:\?.*)?$/.test(path)?path:"/#notifications";}
export function safeNotificationSection(path:string){const match=/^\/#(notifications|schedule|attendance|requests|approvals)(?:\?.*)?$/.exec(safeNotificationPath(path));return match?.[1]??"notifications";}
export function notificationTargetId(path:string){const query=safeNotificationPath(path).split("?")[1];return query?new URLSearchParams(query).get("id"):null;}
