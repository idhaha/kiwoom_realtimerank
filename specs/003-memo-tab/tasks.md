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

- [x] T004 [US1] 메모 저장이 타이핑 중 자동 발생하지 않고 [저장] 버튼 클릭 시에만 발생하는지 확인(FR-004) — `public/app.js`
- [x] T005 [P] [US1] `memoHtml`, `memoDelta` 이중 저장(FR-003)이 data-model.md 필드와 일치하는지 확인 — `public/app.js`
- [x] T006 [US1] [Today] 버튼이 현재 일시를 굵게 삽입하는지 확인(FR-002) — `public/app.js`
- [x] T007 [US1] 서버 통신 실패 시 로컬 저장소(`memoContent_html`, `memoContent_delta`) 보존(FR-006)을 확인 — `public/app.js`
- [x] T008 [US1] [새로고침] 버튼이 전체 페이지 리로드 없이 서버 최신값으로 에디터만 갱신하는지 확인(FR-005) — `public/app.js`
- [x] T009 [US1] T004~T008 불일치 수정 — `public/app.js`
- [x] T010 [US1] quickstart.md 시나리오 1~3 실행 후 SC-001, SC-002 확인

**Checkpoint**: User Story 1 독립적으로 동작

---

## Phase 4: User Story 2 - Google 캘린더 일정 관리 (Priority: P2)

**Goal**: Google 인증 후 일정 CRUD 및 공휴일 조회가 정상 동작

### Implementation for User Story 2

- [x] T011 [US2] 허용된 앱 세션 이후 Calendar OAuth scope 자동 요청 및 같은 Google 이메일 검증 경로를 확인(FR-010) — `public/app.js`
- [x] T012 [US2] 사용자 캘린더 + 대한민국 공휴일 캘린더 병렬 조회(FR-007)가 contracts/api.md와 일치하는지 확인 — `public/app.js`
- [x] T013 [P] [US2] 공휴일 이벤트가 읽기 전용으로 표시되는지(FR-008) 확인 — `public/app.js`
- [x] T014 [US2] 일정 등록/수정/삭제(FR-009)가 각각 POST/PUT/DELETE로 정상 반영되는지 확인 — `public/app.js`
- [x] T015 [US2] 401 토큰 만료 시 자동 재인증(FR-011)이 동작하는지 확인 — `public/app.js`
- [x] T016 [US2] T011~T015 불일치 수정 — `public/app.js`
- [x] T017 [US2] quickstart.md 시나리오 4~6 실행

**Checkpoint**: User Story 1, 2 모두 독립적으로 동작

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T018 숨김 탭 초기화 예외 케이스(Edge Case) 재확인 — `public/app.js`
- [x] T019 quickstart.md 기존 시나리오(1~7) 최종 실행
- [x] T020 서비스 허용 목록과 Google Cloud OAuth 테스트 사용자 목록은 별개이며, 테스트 audience의 외부 계정은 Calendar scope 승인에 제한이 있음을 문서화 — `spec.md`, `plan.md`, `quickstart.md`
- [x] T021 `idhaha@gmail.com`을 Google Cloud 테스트 사용자로 추가하지 않기로 한 결정을 기록하고, 해당 계정의 `403 access_denied`를 현재 운영 제한으로 남김 — `spec.md`, `quickstart.md`

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
- [x] **T007 🟢** localhost 브라우저에서 오프라인 저장 실패를 재현했다. 실패 알림 뒤 `memoContent_html`과 `memoPendingServerSyncV1.memoHtml`에서 테스트 표시가 확인됐고, 온라인 복귀 후 `[서버에서 불러오기]`를 눌러도 테스트 표시가 에디터에 남았다. 서버로 테스트 메모를 성공 저장하지 않았다.
- [x] **T008 🟢** localhost 브라우저에서 `[서버에서 불러오기]` 클릭 후 `서버에서 불러오기 완료 ✓`를 확인했다. 페이지 전체 reload 없이 에디터만 갱신됐다.
- [x] **T009 🟢** T004~T008에서 발견된 구현 불일치를 수정했다. 자동 저장 비활성 유지, Today 타임스탬프, 실패 시 로컬 우선 저장 및 서버 최신값 재로드 흐름을 확인했다.
- [x] **T009a 🟢** 메모 저장 실패 시 시각이 있는 미동기화 사본을 localStorage에 보존하고, 서버의 오래된 메모가 이를 덮지 않도록 했다. 서버 설정 JSON은 원자적으로 교체하고, 서버 메모 변경 전 기존 비어 있지 않은 메모를 `user_settings.memo-backup.json`에 백업한다. 전체 백업 복원에서 HTML 필드가 빠졌을 때 빈 메모를 전송하지 않도록 했다. localhost에서 동일 메모 저장·재조회 및 `memoUpdatedAt` 생략 일반 설정 저장을 실행해 메모와 저장 시각이 보존되는 것을 확인했다.
- [x] **T010 🟢** quickstart 시나리오 1~3 완료. 저장 피드백과 Today 삽입은 앞서 브라우저에서 확인했고, 오프라인 저장 실패 후 localStorage 보존 및 서버 새로고침 뒤 복구를 이번 런타임 검증에서 확인했다.

### User Story 2

- [x] **T011 🟢** GIS `initTokenClient()`는 토큰 클라이언트를 준비할 뿐 자동 인증 요청을 보내지 않음. 실제 `requestAccessToken()` 호출은 `동기화`/캘린더 조작 시점에 발생함.
- [x] **T012 🟢** `fetchCalendarEvents()`에서 기본 캘린더와 대한민국 공휴일 캘린더를 `Promise.all()`로 병렬 조회함.
- [x] **T013 🟢** 공휴일 이벤트에 `extendedProps.isHoliday=true`, `editable:false`가 설정되고 모달에서 저장/삭제 버튼이 숨겨짐.
- [x] **T014 🟢** 일정 생성은 POST, 수정은 PUT, 삭제는 DELETE로 Google Calendar API를 호출함.
- [x] **T015 🟢** 로그인된 브라우저에서 테스트용 무효 토큰을 설정해 Google Calendar 요청의 401을 유도했다. GIS 재인증 후 캘린더가 다시 로드됐다. 실제 시간 만료 토큰 자체를 기다려 검증한 것은 아니지만, 동일한 401 재인증 경로를 실제 OAuth 요청으로 확인했다.
- [x] **T016 🟢** T011~T015에서 발견된 코드 불일치를 수정했다.
- [x] **T017 🟢** quickstart 시나리오 4~6은 로그인된 localhost 브라우저에서 동기화, 일정 CRUD, 공휴일 읽기 전용 동작을 확인했다.

### Polish

- [x] **T018 🟢** 현재 구현은 메모 탭이 실제 활성화된 뒤 Quill/FullCalendar를 초기화하는 구조임. 숨김 탭에서의 최초 초기화는 피하도록 되어 있음.
- [x] **T019 🟢** quickstart 시나리오 1~7 완료. 저장/Today/오프라인 복구(1~3), 캘린더 및 일정 동작(4~6), 다른 브라우저 간 메모 갱신과 원본 복구(7)를 localhost에서 확인했다.

### 현재 결론

**T004~T019의 구현 검토 및 런타임 검증을 완료했습니다. quickstart 1~7과 실제 OAuth를 통한 401 재인증 경로를 localhost에서 확인했습니다.**

타이핑 중 자동 저장은 계속 비활성화되어 있습니다. 서버 저장 실패 시에도 localStorage 복사본은 먼저 보존됩니다.

저장 안정성 정적 검토에서 발견한 로컬 우선권 손실 경로, 비원자적 파일 쓰기, 메모 백업 부재를 보완했다. localhost에서 메모 API 및 일반 설정 저장 뒤의 메모 무결성과 저장 시각 보존을 확인했다. 오프라인 저장 실패 뒤 localStorage 대기본이 보존되고, 서버 새로고침 후에도 오래된 서버값에 덮이지 않는 것을 확인했다.

2026-10-01 localhost UI 재확인: 현재 편집 HTML과 서버 메모의 해시가 동일한 것을 확인한 뒤 메모 저장 버튼을 눌러 `서버 저장 완료 ✓`, 서버에서 불러오기 버튼을 눌러 `서버에서 불러오기 완료 ✓` 상태를 확인했다. 화면 메모 내용은 변경하지 않았다. 당시 Google 재인증 로직은 401→새 토큰→200 mock 흐름에서 요청 2회/재인증 1회를 통과했고, 실제 계정 검증은 후속 작업으로 남겨 두었다.

## 2026-10-03 Google OAuth 테스트 audience 조사

- **T020 🟢** 사용자가 `azikanbal@gmail.com`으로 앱 관리자 로그인 후 서비스 허용 목록에 `idhaha@gmail.com`을 등록했다. 앱 로그아웃 후 idhaha 계정으로 서비스 로그인이 됐지만, 일정 탭에서 Calendar scope 동의 시 Google이 `403 access_denied`와 “앱은 현재 테스트 중이며 개발자가 승인한 테스터만 접근 가능” 메시지를 반환했다.
- **Finding**: `authorized_emails.json`의 앱 로그인 허용은 Google Cloud OAuth audience의 테스트 사용자 권한과 독립적이다. Calendar API scope를 승인하려면 Google Cloud의 테스트 audience에도 해당 사용자가 있어야 한다.
- **Decision**: 사용자는 `idhaha@gmail.com`을 Google Cloud 테스트 사용자로 추가하지 않기로 했다. Google Cloud 설정은 변경하지 않으며, 이 계정의 Calendar 동기화는 승인 거부 상태로 남는다. 앱 로그인 및 다른 dashboard 기능은 서비스 허용 목록에 따라 계속 사용할 수 있다.
- **Operational constraint**: Google OAuth `Testing` 모드는 문서상 최대 100명의 테스트 사용자를 허용하고, 테스트 사용자 권한은 7일 후 만료될 수 있다. 향후 일반 사용자에게 제공하려면 Google Auth Platform에서 게시/검증 절차를 검토해야 한다.
- **Source**: [Google OAuth App Audience](https://support.google.com/cloud/answer/15549945?hl=en), [Google 403 access_denied guidance](https://support.google.com/accounts/answer/16668185?hl=en).
- **T022 🟢** quickstart.md에 OAuth audience 확인 및 테스트 사용자 미등록 시 예상되는 동기화 거부 시나리오를 추가했다. 해당 신규 Google Cloud 차단 시나리오는 계정 정책을 바꾸지 않고 문서화만 했다.


## 2026-10-01 추가 런타임 검증

- **T014 🟢** 로그인된 localhost 브라우저에서 테스트 일정을 생성(POST), 제목 수정(PUT), 삭제(DELETE)했다. 다시 동기화한 뒤 테스트 일정이 남지 않았음을 확인했다.
- **T017 🟢** 캘린더 동기화 후 기존 일정과 공휴일이 표시됐고, 일정 생성/수정/삭제 및 공휴일 클릭 시 제목 비활성화·저장/삭제 버튼 미표시를 확인했다. 승인된 테스트 일정은 삭제 후 동기화해 잔존하지 않는 것도 확인했다.
- **T007/T010 🟢** 사용자가 localhost 브라우저에서 오프라인 상태의 저장 실패 알림, localStorage 로컬/대기본의 테스트 표시, 온라인 복귀 후 서버 새로고침 시 표시 유지까지 확인했다.
- **T019 🟢** 사용자가 별도 브라우저에서 메모를 불러온 뒤 변경사항을 저장했고, 원래 브라우저의 서버 새로고침에서 이를 확인했다. 테스트 표시를 제거해 다시 저장한 뒤 원래 브라우저에서도 복구를 확인했다.
- **T015 🟢** 사용자가 테스트용 무효 토큰으로 401을 유도했고, GIS 재인증 후 캘린더가 다시 로드됐다고 확인했다. 실제 시간 만료 토큰은 사용하지 않았으며, 강제 폐기/revoke도 하지 않았다.
- **T019 🟢** quickstart 전체 시나리오 1~7 완료.

