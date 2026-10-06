"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { parseLoginIdentity } from "@/auth/identity";
import { clearPrivateBrowserData, reconcileSessionUser } from "@/auth/session-storage";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/auth/supabase";
import { hasActiveWorkScope, loadUserContext, type UserContext } from "@/auth/user-context";
import { RoleShell } from "@/components/role-shell";

type Screen = "loading" | "signed-out" | "signed-in" | "unlinked" | "error" | "config-missing";

function BrandHeader() {
  return <header className="brand-bar auth-brand"><span className="brand-mark"><Image src="/icons/icon-192.png" alt="" width={34} height={34} priority /></span><strong>TimeFit</strong><span className="security-badge">안전한 로그인</span></header>;
}

type AuthGateProps = { supabaseUrl?: string; supabaseKey?: string };

export function AuthGate({ supabaseUrl, supabaseKey }: AuthGateProps) {
  const [screen, setScreen] = useState<Screen>("loading");
  const [context, setContext] = useState<UserContext | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resolveSession = useCallback(async (session: Session | null) => {
    reconcileSessionUser(session?.user.id ?? null);
    if (!session) { setContext(null); setScreen("signed-out"); return; }
    try {
      const nextContext = await loadUserContext(getSupabaseBrowserClient(supabaseUrl, supabaseKey));
      setContext(nextContext);
      setScreen(hasActiveWorkScope(nextContext) ? "signed-in" : "unlinked");
    } catch {
      setMessage("계정 정보를 확인하지 못했습니다. 네트워크 연결 후 다시 시도해 주세요.");
      setScreen("error");
    }
  }, [supabaseKey, supabaseUrl]);

  useEffect(() => {
    let unsubscribe = () => {};
    const timer = window.setTimeout(() => {
      if (!hasSupabaseConfig(supabaseUrl, supabaseKey)) {
        setScreen("config-missing");
        return;
      }
      const client = getSupabaseBrowserClient(supabaseUrl, supabaseKey);
      void client.auth.getSession().then(({ data }) => resolveSession(data.session));
      const { data } = client.auth.onAuthStateChange((_event, session) => { void resolveSession(session); });
      unsubscribe = () => data.subscription.unsubscribe();
    }, 0);
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, [resolveSession, supabaseKey, supabaseUrl]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identity = parseLoginIdentity(identifier);
    if (!identity) { setMessage("휴대전화번호 또는 이메일 형식을 확인해 주세요."); return; }
    if (password.length < 10) { setMessage("비밀번호는 10자 이상 입력해 주세요."); return; }
    setSubmitting(true); setMessage("");
    const credentials = identity.kind === "email" ? { email: identity.value, password } : { phone: identity.value, password };
    const { error } = await getSupabaseBrowserClient(supabaseUrl, supabaseKey).auth.signInWithPassword(credentials);
    if (error) { setMessage("아이디 또는 비밀번호를 확인해 주세요."); setSubmitting(false); return; }
    setPassword(""); setSubmitting(false);
  }

  async function signOut() {
    setSubmitting(true);
    await getSupabaseBrowserClient(supabaseUrl, supabaseKey).auth.signOut({ scope: "local" });
    clearPrivateBrowserData();
    setSubmitting(false);
  }

  if (screen === "loading") return <main className="auth-shell centered-page" aria-busy="true"><div className="spinner" /><h1>로그인 정보를 확인하고 있어요</h1><p>안전한 세션을 복원하는 중입니다.</p></main>;

  if (screen === "config-missing") return <main className="auth-shell"><BrandHeader /><section className="notice-card danger"><span>설정 필요</span><h1>인증 연결이 준비되지 않았어요</h1><p>배포 환경의 Supabase 공개 URL과 Publishable Key를 설정해 주세요.</p></section></main>;

  if (screen === "signed-out") return <main className="auth-shell"><BrandHeader /><section className="login-card"><span className="eyebrow blue">직원·관리자 계정</span><h1>내 근무 정보로<br />안전하게 로그인해요</h1><p className="login-intro">직원은 휴대전화번호, 관리자는 이메일을 입력해 주세요.</p><form onSubmit={signIn} noValidate><label htmlFor="identifier">아이디</label><input id="identifier" name="identifier" inputMode="email" autoComplete="username" value={identifier} onChange={(event)=>setIdentifier(event.target.value)} placeholder="010-1234-5678 또는 name@email.com" /><label htmlFor="password">비밀번호</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={10} value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="10자 이상 입력" />{message && <p className="form-error" role="alert">{message}</p>}<button className="primary-button" type="submit" disabled={submitting}>{submitting ? "로그인 중…" : "로그인"}</button></form><div className="login-help"><a href="mailto:support@timefit.kr?subject=TimeFit%20계정%20초대%20요청">계정 연결이 필요해요</a><a href="mailto:support@timefit.kr?subject=TimeFit%20비밀번호%20재설정">비밀번호를 잊었어요</a></div><div className="login-install-note"><span aria-hidden="true">+</span><p><strong>홈 화면에 추가</strong>하면 앱처럼 빠르게 실행하고 출퇴근 알림을 받을 수 있어요.</p></div></section><p className="security-note">관리자는 비밀번호를 요청하거나 대신 설정하지 않습니다.</p></main>;

  if (screen === "unlinked") return <main className="auth-shell"><BrandHeader /><section className="notice-card"><span>계정 확인 필요</span><h1>{context?.invitation ? "초대를 수락해 주세요" : "연결된 직원 정보가 없어요"}</h1><p>{context?.invitation ? `${context.invitation.timefit_user_organizations?.name ?? "사업장"}에서 보낸 초대가 있습니다.` : "관리자에게 모바일 계정 초대를 요청해 주세요."}</p><button className="secondary-button" onClick={signOut} disabled={submitting}>다른 계정으로 로그인</button></section></main>;

  if (screen === "error") return <main className="auth-shell"><BrandHeader /><section className="notice-card danger"><span>연결 오류</span><h1>계정 정보를 확인할 수 없어요</h1><p>{message}</p><button className="primary-button" onClick={()=>window.location.reload()}>다시 시도</button><button className="text-button" onClick={signOut}>로그아웃</button></section></main>;

  return context ? <RoleShell userContext={context} onSignOut={signOut} /> : null;
}
