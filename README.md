# TimeFit Mobile PWA

직원·서브 관리자·총책임자·사장이 사용하는 TimeFit 모바일 PWA입니다.

Flutter 프로토타입은 Git 태그 `flutter-prototype`에 보존되어 있습니다. 현재 기본 개발 경로는 Next.js App Router와 TypeScript 기반 PWA입니다.

## 시작하기

Node.js 22 LTS를 기준으로 개발합니다(`.nvmrc` 제공).

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

로컬에서는 `http://localhost:3000`으로 접속합니다. 카메라·Service Worker·설치 기능은 localhost 또는 HTTPS 환경에서만 정상 동작합니다.

## 검증

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## PWA 정책

- 앱 이름: `TimeFit`
- Manifest ID, 시작 URL, scope: `/`
- 설치 모드: `standalone`
- 정적 앱 셸과 아이콘만 Service Worker 캐시에 저장
- 인증, API 쓰기, 급여, 영수증, 직원 상세는 캐시하지 않음
- 새 버전은 사용자 확인 후 활성화
- 오프라인에서 출퇴근·승인·제출을 성공 처리하지 않음

## 저장소 경계

- 이 저장소: 모바일 PWA, 설치 UX, 모바일 화면과 클라이언트 테스트
- `time_fit`: 관리자 웹, Supabase 마이그레이션·RPC·Edge Function, 공용 백엔드 계약

운영 키나 서비스 역할 키는 저장소와 브라우저 번들에 포함하지 않습니다.

## MOB-02 실제 기기 점검

- Android Chrome: 설치 프롬프트, 아이콘, standalone 실행, 재실행, 업데이트
- Samsung Internet: 홈 화면 추가, standalone 실행
- iPhone Safari: 안내에 따른 홈 화면 추가, 아이콘, standalone 실행
- iPad Safari: 설치, 방향, 안전 영역, 재실행

실제 기기 검증은 HTTPS staging 배포에서 수행합니다.
