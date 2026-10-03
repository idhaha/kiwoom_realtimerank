# Tasks: Google 계정 접근 제어 및 프로필

**Input**: `/specs/008-google-account-access/`

## Implementation

- [x] T001 Google ID 토큰 검증, 허용 이메일 확인 및 서버 세션 발급 — `server.js`
- [x] T002 모든 데이터 API 앞에 세션 미들웨어를 배치하고 공개 인증 절차만 예외 처리 — `server.js`
- [x] T003 관리자 전용 허용 이메일 조회·등록·삭제 및 삭제된 계정 세션 폐기 — `server.js`
- [x] T004 로그인 전에 서버 세션을 확인하고 승인 이후에만 대시보드 데이터를 로드 — `public/app.js`
- [x] T005 프로필 아이콘, 허용 계정 관리 모달 및 하단 로그아웃 구현 — `public/index.html`, `public/app.js`, `public/style.css`
- [x] T006 허용 목록 파일을 Git 추적 대상에서 제외 — `.gitignore`
- [x] T007 API 공개·인증 계약, 관리 권한 및 세션 동작 문서화 — `contracts/api.md`

## Verification

- [x] T008 서버와 클라이언트 스크립트 구문 검사 및 `git diff --check`
- [ ] T009 브라우저에서 허용/미허용 계정 로그인, 관리자/일반 사용자 권한, 로그아웃 및 새로고침 동작 확인

> Google 연동 및 UI 동작의 최종 확인은 브라우저에서 실제 계정으로 수행해야 한다.
