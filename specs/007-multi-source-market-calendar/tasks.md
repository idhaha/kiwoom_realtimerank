# Tasks: 증시캘린더 다중 소스 탭

**Input**: `/specs/007-multi-source-market-calendar/`

## Implementation

- [x] T001 세 공급자 라벨, iframe URL, 원본 URL을 증시캘린더 마크업에 추가 — `public/app.js`
- [x] T002 선택 공급자에 따라 iframe, 탭 상태, 원본 링크 갱신 — `public/app.js`
- [x] T003 선택 상태를 기존 앱 설정 저장 경로에 저장 — `public/app.js`
- [x] T004 작은 탭의 선택·포커스 UI 스타일 추가 — `public/style.css`
- [x] T005 사용자 시나리오, 제약, 수동 검증 절차 문서화 — `spec.md`, `plan.md`, `quickstart.md`
- [x] T008 캘린더 소형 탭 제목을 `지표/실적 일정`, `배당 일정`, `FED 금리 일정`으로 지정 — `public/app.js`

## Verification

- [ ] T006 정적 확인으로 앱 스크립트 문법 및 세 URL/기본 Toss 선택/상태 저장 경로 검토
- [ ] T007 브라우저에서 세 탭 전환, iframe 허용 여부, 원본 링크, 재시작 후 선택 유지 확인

> 실제 외부 사이트 렌더링과 저장 복원은 브라우저/실행 앱에서 검증해야 하므로 정적 검토만으로 완료 처리하지 않는다.
