"use client";
import {useCallback,useEffect,useState} from "react";
import type {MobileRoleContext,MobileSection} from "@/authorization/mobile-context";
import {getSupabaseBrowserClient} from "@/auth/supabase";
import {loadNotifications,readNotification,safeNotificationPath,safeNotificationSection,type NotificationInbox as Inbox} from "@/notifications/inbox";

export function NotificationInbox({context,onNavigate}:{context:MobileRoleContext;onNavigate:(section:MobileSection,path?:string)=>void}){
  const[state,setState]=useState<Inbox|null>(null);const[error,setError]=useState("");const[loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{setError("");try{setState(await loadNotifications(getSupabaseBrowserClient(),context.organizationId));}catch{setError("알림을 불러오지 못했어요.");}finally{setLoading(false);}},[context.organizationId]);
  useEffect(()=>{const timer=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(timer);},[refresh]);
  const open=async(id:string,path:string)=>{try{const saved=safeNotificationPath(await readNotification(getSupabaseBrowserClient(),id)||path);setState(current=>current?{...current,unreadCount:Math.max(0,current.unreadCount-Number(current.items.find(item=>item.id===id)?.read_at===null)),items:current.items.map(item=>item.id===id?{...item,read_at:item.read_at??new Date().toISOString()}:item)}:current);onNavigate(safeNotificationSection(saved) as MobileSection,saved);}catch{setError("알림을 확인 처리하지 못했어요.");}};
  if(loading)return <section className="notification-state" aria-busy="true">알림을 불러오는 중…</section>;
  return <section className="notification-inbox"><div className="notification-summary"><div><span>읽지 않은 알림</span><strong>{state?.unreadCount??0}</strong></div><button onClick={()=>void refresh()}>새로고침</button></div>{error&&<p className="notification-error" role="status">{error}</p>}<div className="notification-list">{state?.items.length?state.items.map(item=><button className={item.read_at?"read":"unread"} key={item.id} onClick={()=>void open(item.id,item.deeplink_path)}><i/><span><b>{item.title}</b><small>{item.body}</small><time>{new Intl.DateTimeFormat("ko-KR",{dateStyle:"short",timeStyle:"short"}).format(new Date(item.created_at))}</time></span><em>›</em></button>):<div className="notification-empty"><strong>새 알림이 없어요</strong><p>스케줄과 업무 변경 알림이 여기에 표시됩니다.</p></div>}</div></section>;
}
