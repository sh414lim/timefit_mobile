# MOB-03 구현 및 검증 기록

## 구현 범위

- 직원 휴대전화번호와 관리자 이메일을 구분하는 로그인 입력
- 국내 휴대전화번호의 E.164 정규화
- Supabase Auth 비밀번호 로그인과 브라우저 세션 유지/자동 갱신
- `get-user-context` 호출을 통한 계정·멤버십·관리자 상태 확인
- 미연결 계정, 정지된 관리자 계정, API 오류, 설정 누락 화면
- 로그아웃 시 TimeFit 업무 캐시 및 세션 화면 상태 제거
- Service Worker의 API·인증 응답 비캐시 정책 유지

## 보안 결정

- 로그인 실패 시 계정 존재 여부를 노출하지 않는 공통 오류를 표시한다.
- 클라이언트가 직원 ID나 역할을 선택하지 않고 서버 컨텍스트를 사용한다.
- 공개 가능한 Supabase URL과 Publishable Key만 브라우저 번들에 포함한다.
- 서비스 역할 키와 사용자 비밀번호는 모바일 앱에 저장하지 않는다.
- 사업장 멤버십이 없는 인증 계정은 업무 화면에 진입하지 못한다.

## 검증 명령

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

검증 결과: lint, typecheck, 테스트 24개, production build 모두 성공.

## iOS 시뮬레이터 검증

- 기기: iPhone 16 Pro / iOS 18.1
- 브라우저: Mobile Safari
- 결과: 로그인 화면, safe area, 입력 필드, CTA, 도움 링크가 정상 표시됨
- 휴대전화번호/이메일 형식 오류 메시지가 정상 표시됨
- 검증 이미지: `/private/tmp/mob03-ios.png`

## 후속 운영 설정

- 배포 프로젝트에 `NEXT_PUBLIC_SUPABASE_URL` 및 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 등록한다.
- Supabase Auth에서 휴대전화+비밀번호 로그인을 사용할 경우 전화 인증 공급자를 활성화한다.
- 관리자 MFA 강제와 초대 발급 UI는 서버 정책 및 관리자 화면 작업과 연동한다.
