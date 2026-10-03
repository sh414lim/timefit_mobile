import Image from "next/image";
import { InstallCard } from "@/components/install-card";

const foundationItems = [
  ["설치", "Android와 iPhone 홈 화면에서 앱처럼 실행"],
  ["안전한 캐시", "정적 앱 셸만 저장하고 민감한 업무 데이터는 제외"],
  ["업데이트", "새 버전을 감지해 사용자가 원하는 시점에 반영"]
] as const;

export default function Home() {
  return (
    <main className="app-shell">
      <header className="brand-bar"><span className="brand-mark"><Image src="/icons/icon-192.png" alt="" width={34} height={34} priority /></span><strong>TimeFit</strong><span className="foundation-badge">PWA 기반</span></header>
      <section className="hero-card">
        <div className="hero-copy"><span className="eyebrow">MOB-02 · 설치 및 실행 기반</span><h1>근무 업무를<br />더 빠르게 시작하세요</h1><p>TimeFit 모바일은 직원과 관리자가 일정, 출퇴근, 휴가 업무를 안전하게 처리할 수 있는 설치형 웹 앱입니다.</p></div>
        <div className="hero-logo" aria-hidden="true"><Image src="/icons/icon-512.png" alt="" width={144} height={144} priority /></div>
      </section>
      <InstallCard />
      <section className="foundation-list" aria-labelledby="foundation-title">
        <div className="section-heading"><span>준비된 기반</span><h2 id="foundation-title">안전하게 설치하고 실행해요</h2></div>
        {foundationItems.map(([title, description], index) => <article key={title}><span>{index + 1}</span><div><strong>{title}</strong><p>{description}</p></div></article>)}
      </section>
      <footer><span className="status-dot" aria-hidden="true" />PWA 실행 기반이 준비되었습니다</footer>
    </main>
  );
}
