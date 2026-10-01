# Tasks: 메모 탭 — 캘린더 및 리치 텍스트 메모

**Input**: Design documents from `/specs/003-memo-tab/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 브라운필드 검증 작업. quickstart.md로 검증.

## Phase 1: Setup

- [x] T001 Quill v1.3.6, FullCalendar v6.1.10 CDN 스크립트가 `public/index.html`에 정상 로드되는지 확인

## Phase 2: Foundational

**⚠️ CRITICAL**

- [x] T002 Quill/FullCalendar가 탭이 처음 활성화(`activateTab('tab_memo')`)되는 시점에만 초기화되는지 확인(숨김 탭 높이 0 에러 방지, research.md 결정) — `public/app.js`
- [x] T003 [P] `POST /api/settings`, `GET /api/settings`가 정상 동작하는지 확인(006-settings-sync와 공유 엔드포인트) — `server.js`

**Checkpoint**: 초기화/저장 공통 인프라 검증 완료

---

## Phase 3: User Story 1 - 리치 텍스트 메모 작성 및 저장 (Priority: P1) 🎯 MVP

**Goal**: 메모를 작성하고 명시적 저장으로 HTML+Delta가 로컬·서버에 저장됨

**Independent Test**: 메모 작성 → 저장 → 새로고침 후 유지 확인

### Implementation for User Story 1

- [ ] T004 [US1] 메모 저장이 타이핑 중 자동 발생하지 않고 [저장] 버튼 클릭 시에만 발생하는지 확인(FR-004) — `public/app.js`
- [x] T005 [P] [US1] `memoHtml`, `memoDelta` 이중 저장(FR-003)이 data-model.md 필드와 일치하는지 확인 — `public/app.js`
- [ ] T006 [US1] [Today] 버튼이 현재 일시를 굵게 삽입하는지 확인(FR-002) — `public/app.js`
- [x] T007 [US1] 서버 통신 실패 시 로컬 저장소(`memoContent_html`, `memoContent_delta`) 보존(FR-006)을 확인 — `public/app.js`
- [x] T008 [US1] [새로고침] 버튼이 전체 페이지 리로드 없이 서버 최신값으로 에디터만 갱신하는지 확인(FR-005) — `public/app.js`
- [x] T009 [US1] T004~T008 불일치 수정 — `public/app.js`
- [ ] T010 [US1] quickstart.md 시나리오 1~3 실행 후 SC-001, SC-002 확인

**Checkpoint**: User Story 1 독립적으로 동작

---

## Phase 4: User Story 2 - Google 캘린더 일정 관리 (Priority: P2)

**Goal**: Google 인증 후 일정 CRUD 및 공휴일 조회가 정상 동작

### Implementation for User Story 2

- [x] T011 [US2] GIS OAuth2 Implicit Flow가 앱 구동 시 자동 실행되지 않고 사용자 동작 시에만 트리거되는지 확인(FR-010) — `public/app.js`
- [x] T012 [US2] 사용자 캘린더 + 대한민국 공휴일 캘린더 병렬 조회(FR-007)가 contracts/api.md와 일치하는지 확인 — `public/app.js`
- [x] T013 [P] [US2] 공휴일 이벤트가 읽기 전용으로 표시되는지(FR-008) 확인 — `public/app.js`
- [x] T014 [US2] 일정 등록/수정/삭제(FR-009)가 각각 POST/PUT/DELETE로 정상 반영되는지 확인 — `public/app.js`
- [ ] T015 [US2] 401 토큰 만료 시 자동 재인증(FR-011)이 동작하는지 확인 — `public/app.js`
- [x] T016 [US2] T011~T015 불일치 수정 — `public/app.js`
- [x] T017 [US2] quickstart.md 시나리오 4~6 실행

**Checkpoint**: User Story 1, 2 모두 독립적으로 동작

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T018 숨김 탭 초기화 예외 케이스(Edge Case) 재확인 — `public/app.js`
- [ ] T019 quickstart.md 전체 시나리오(1~7) 최종 실행

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2(US1과 독립적으로 병렬 가능) → Polish

## Notes

- Google Calendar 관련 작업(US2)은 실제 Google 계정 인증이 필요하므로 검증 시 테스트 계정을 사용할 것을 권장.

---

## Verification Log — 2026-10-01

> 정적 코드 검토와 브라우저/Google 계정이 필요한 검증을 구분한다. 외부 Google Calendar에 테스트 일정을 쓰는 검증은 수행하지 않았다.

### Phase 1 / Foundational

- [x] **T001 🟢** `public/index.html`에 Quill **1.3.6**, FullCalendar **6.1.10**, Google Identity Services CDN 스크립트가 존재함.
- [x] **T002 🟢** `activateTab('tab_memo')` → `initializeTab()` 경로에서만 `initMemoEditor()` / `initCalendar()`가 호출되도록 구현되어 있음. 숨김 상태에서 즉시 초기화하는 코드는 확인되지 않음.
- [x] **T003 🟢** `GET /api/settings`, `POST /api/settings`가 존재하고 200 응답 `{ success: true, ... }` 계약에 맞는 구현이 확인됨.

### User Story 1

- [x] **T004 🟢** localhost 브라우저에서 `[서버로 저장하기]` 클릭 후 `서버 저장 완료 ✓` 상태를 확인했다. 서버 저장 전 현재 편집 HTML과 저장본의 해시가 일치하는지 먼저 확인해 기존 메모 내용을 덮지 않았다.
- [x] **T005 🟢** `memoHtml` + `memoDelta`를 함께 `localStorage` 및 서버 저장 경로로 전달함. Delta는 Quill Delta 객체로 저장됨.
- [x] **T006 🟢** `[Today]` 클릭 시 `[YYYY-MM-DD HH:mm:ss]` 형식의 현지 현재 시각을 굵게 삽입하며, 사용자가 브라우저에서 표시를 확인했다.
- [ ] **T007 ⏳** 로컬 미동기화 사본 보존 및 오래된 서버값 덮어쓰기 방지 코드는 추가했고 서버 저장 왕복은 검증했다. 저장 실패를 주입해 재접속 복구를 확인하는 런타임 시나리오는 사용자가 나중으로 미뤘다.
- [x] **T008 🟢** localhost 브라우저에서 `[서버에서 불러오기]` 클릭 후 `서버에서 불러오기 완료 ✓`를 확인했다. 페이지 전체 reload 없이 에디터만 갱신됐다.
- [x] **T009 🟢** T004~T008에서 발견된 구현 불일치를 수정했다. 자동 저장 비활성 유지, Today 타임스탬프, 실패 시 로컬 우선 저장 및 서버 최신값 재로드 흐름을 확인했다.
- [x] **T009a 🟢** 메모 저장 실패 시 시각이 있는 미동기화 사본을 localStorage에 보존하고, 서버의 오래된 메모가 이를 덮지 않도록 했다. 서버 설정 JSON은 원자적으로 교체하고, 서버 메모 변경 전 기존 비어 있지 않은 메모를 `user_settings.memo-backup.json`에 백업한다. 전체 백업 복원에서 HTML 필드가 빠졌을 때 빈 메모를 전송하지 않도록 했다. localhost에서 동일 메모 저장·재조회 및 `memoUpdatedAt` 생략 일반 설정 저장을 실행해 메모와 저장 시각이 보존되는 것을 확인했다.
- [ ] **T010 ⏳** quickstart 시나리오 1~3은 실제 브라우저 실행 검증 필요.

### User Story 2

- [x] **T011 🟢** GIS `initTokenClient()`는 토큰 클라이언트를 준비할 뿐 자동 인증 요청을 보내지 않음. 실제 `requestAccessToken()` 호출은 `동기화`/캘린더 조작 시점에 발생함.
- [x] **T012 🟢** `fetchCalendarEvents()`에서 기본 캘린더와 대한민국 공휴일 캘린더를 `Promise.all()`로 병렬 조회함.
- [x] **T013 🟢** 공휴일 이벤트에 `extendedProps.isHoliday=true`, `editable:false`가 설정되고 모달에서 저장/삭제 버튼이 숨겨짐.
- [x] **T014 🟢** 일정 생성은 POST, 수정은 PUT, 삭제는 DELETE로 Google Calendar API를 호출함.
- [ ] **T015 🟠** 현재 `requestCalendarWithReauth()`에 만료 401→재인증→새 토큰 1회 재시도를 합성 응답으로 검증했다. 실제 Google 계정의 만료 토큰 검증은 남아 있다.
- [x] **T016 🟢** T011~T015에서 발견된 코드 불일치를 수정했다.
- [ ] **T017 ⏳** quickstart 시나리오 4~6은 실제 Google 계정/브라우저 인증이 필요.

### Polish

- [x] **T018 🟢** 현재 구현은 메모 탭이 실제 활성화된 뒤 Quill/FullCalendar를 초기화하는 구조임. 숨김 탭에서의 최초 초기화는 피하도록 되어 있음.
- [ ] **T019 ⏳** quickstart 전체 1~7 최종 실행은 브라우저/Google 인증 환경에서 수행 필요.

### 현재 결론

**메모 저장 UI 경로와 서버 불러오기를 localhost에서 확인했습니다. 실패 주입과 Google Calendar 외부 연동 검증은 남아 있습니다.**

1. **T007/T010:** 저장 실패 복구와 offline localStorage 보존 시나리오(사용자가 추후 검증 요청).
2. **T015/T017/T019:** 실제 Google 토큰 만료 및 캘린더 연동 동작.

타이핑 중 자동 저장은 계속 비활성화되어 있습니다. 서버 저장 실패 시에도 localStorage 복사본은 먼저 보존됩니다.

저장 안정성 정적 검토에서 발견한 로컬 우선권 손실 경로, 비원자적 파일 쓰기, 메모 백업 부재를 보완했다. localhost에서 메모 API 및 일반 설정 저장 뒤의 메모 무결성과 저장 시각 보존을 확인했다. 브라우저 편집 실패 후 재접속 시 로컬 대기본을 지키는 장애 재현 시나리오는 별도 검증이 남아 있다.

2026-10-01 localhost UI 재확인: 현재 편집 HTML과 서버 메모의 해시가 동일한 것을 확인한 뒤 메모 저장 버튼을 눌러 `서버 저장 완료 ✓`, 서버에서 불러오기 버튼을 눌러 `서버에서 불러오기 완료 ✓` 상태를 확인했다. 화면 메모 내용은 변경하지 않았다. Google 재인증 로직은 401→새 토큰→200 mock 흐름에서 요청 2회/재인증 1회를 통과했으며, 실제 계정 검증은 남아 있다.


## 2026-10-01 추가 런타임 검증

- **T014 🟢** 로그인된 localhost 브라우저에서 테스트 일정을 생성(POST), 제목 수정(PUT), 삭제(DELETE)했다. 다시 동기화한 뒤 테스트 일정이 남지 않았음을 확인했다.
- **T017 🟢** 캘린더 동기화 후 기존 일정과 공휴일이 표시됐고, 일정 생성/수정/삭제 및 공휴일 클릭 시 제목 비활성화·저장/삭제 버튼 미표시를 확인했다. 승인된 테스트 일정은 삭제 후 동기화해 잔존하지 않는 것도 확인했다.
- **T015** 실제 만료 토큰 재인증은 미검증이며 mock 검증만 완료.
- **T019** 전체 quickstart 완료로 처리하지 않음. 오프라인 저장 실패 복구(T007/T010), 실제 토큰 만료(T015), 다른 브라우저 간 갱신(SC-003)은 미완료/보류.

