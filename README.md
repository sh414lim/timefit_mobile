# TimeFit Mobile

TimeFit의 직원·관리자·사업주용 iOS/Android 애플리케이션입니다.

## 개발 환경

- Flutter 3.38 이상
- Dart 3.10 이상
- 공용 TimeFit Supabase 프로젝트

## 실행

```bash
flutter pub get
flutter run \
  --dart-define=APP_ENV=development \
  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=SUPABASE_PUBLISHABLE_KEY=YOUR_KEY
```

운영 키나 서비스 역할 키를 저장소에 커밋하지 않습니다. 모바일 앱에는 공개 가능한 Supabase publishable key만 전달합니다.

## 검증

```bash
flutter analyze
flutter test
flutter build apk --debug
```

## 저장소 경계

- 이 저장소: Flutter 앱, 모바일 UI/UX, 클라이언트 테스트
- `time_fit` 저장소: 웹 관리자, Supabase 마이그레이션·함수, 공용 백엔드 계약

모바일 앱에서 필요한 DB 변경은 `time_fit/supabase/migrations`에서 먼저 관리합니다.
