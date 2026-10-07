import Link from "next/link";

export const metadata = { title: "오프라인" };

export default function OfflinePage() {
  return <main className="centered-page"><span className="offline-symbol" aria-hidden="true">↻</span><h1>인터넷 연결을 확인해 주세요</h1><p>출퇴근·승인·제출은 연결된 상태에서만 안전하게 처리할 수 있어요.</p><Link className="primary-button" href="/">다시 시도</Link></main>;
}
