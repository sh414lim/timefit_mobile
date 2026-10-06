import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InstallCard } from "@/components/install-card";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "앱 설치 안내", description: "iPhone과 Android에서 TimeFit을 홈 화면 앱으로 설치하는 방법" };

export default function InstallGuidePage() {
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.brand}><Image src="/icons/icon-192.png" alt="" width={36} height={36} /><strong>TimeFit</strong></Link><Link href="/" className={styles.login}>로그인</Link></header>
    <section className={styles.hero}><span>앱 설치 안내</span><h1>다운로드 없이<br />홈 화면에 설치하세요</h1><p>TimeFit은 앱스토어를 거치지 않는 웹앱입니다. Safari 또는 Chrome에서 한 번만 추가하면 일반 앱처럼 실행할 수 있어요.</p></section>
    <InstallCard />
    <section className={styles.guides} aria-label="기기별 설치 방법">
      <article><div className={styles.platform}><span>iOS</span><strong>iPhone · Safari</strong></div><ol><li><b>Safari</b>에서 이 페이지를 엽니다.</li><li>화면 아래 <b>공유</b> 버튼을 누릅니다.</li><li><b>홈 화면에 추가</b> → <b>추가</b>를 누릅니다.</li></ol><p>Chrome이나 카카오톡 안에서 열었다면 공유 메뉴의 ‘Safari에서 열기’를 먼저 선택하세요.</p></article>
      <article><div className={styles.platform}><span>Android</span><strong>Chrome</strong></div><ol><li><b>Chrome</b>에서 이 페이지를 엽니다.</li><li>오른쪽 위 <b>⋮ 메뉴</b>를 누릅니다.</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 선택합니다.</li></ol><p>설치 안내가 바로 나타나는 기기에서는 ‘설치하기’ 버튼만 누르면 됩니다.</p></article>
    </section>
    <section className={styles.permission}><span>QR 출퇴근 준비</span><h2>카메라 권한은 처음 한 번만</h2><p>로그인 후 <b>QR</b> 메뉴에서 ‘카메라로 스캔’을 누르고 카메라 사용을 허용하세요. 권한을 거부했다면 휴대전화 설정의 Safari 또는 Chrome 카메라 권한을 다시 켜 주세요.</p><Link href="/#attendance">출퇴근 화면 열기</Link></section>
    <section className={styles.checklist}><h2>설치 후 확인</h2><ul><li>홈 화면의 TimeFit 아이콘으로 실행</li><li>직원 휴대전화번호와 비밀번호로 로그인</li><li>버터빌라에 표시된 실시간 QR 스캔</li><li>완료 화면에서 출근·퇴근 시간 확인</li></ul></section>
    <footer>TimeFit · 직원 및 관리자 모바일 업무 앱</footer>
  </main>;
}
