# Tasks: 메모 탭 — 캘린더 및 리치 텍스트 메모

**Input**: Design documents from `/specs/003-memo-tab/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 브라운필드 검증 작업. quickstart.md로 검증.

## Phase 1: Setup

- [ ] T001 Quill v1.3.6, FullCalendar v6.1.10 CDN 스크립트가 `public/index.html`에 정상 로드되는지 확인

## Phase 2: Foundational

**⚠️ CRITICAL**

- [ ] T002 Quill/FullCalendar가 탭이 처음 활성화(`activateTab('tab_memo')`)되는 시점에만 초기화되는지 확인(숨김 탭 높이 0 에러 방지, research.md 결정) — `public/app.js`
- [ ] T003 [P] `POST /api/settings`, `GET /api/settings`가 정상 동작하는지 확인(006-settings-sync와 공유 엔드포인트) — `server.js`

**Checkpoint**: 초기화/저장 공통 인프라 검증 완료

---

## Phase 3: User Story 1 - 리치 텍스트 메모 작성 및 저장 (Priority: P1) 🎯 MVP

**Goal**: 메모를 작성하고 명시적 저장으로 HTML+Delta가 로컬·서버에 저장됨

**Independent Test**: 메모 작성 → 저장 → 새로고침 후 유지 확인

### Implementation for User Story 1

- [ ] T004 [US1] 메모 저장이 타이핑 중 자동 발생하지 않고 [저장] 버튼 클릭 시에만 발생하는지 확인(FR-004) — `public/app.js`
- [ ] T005 [P] [US1] `memoHtml`, `memoDelta` 이중 저장(FR-003)이 data-model.md 필드와 일치하는지 확인 — `public/app.js`
- [ ] T006 [US1] [Today] 버튼이 현재 일시를 굵게 삽입하는지 확인(FR-002) — `public/app.js`
- [ ] T007 [US1] 서버 통신 실패 시 로컬 저장소(`memoContent_html`, `memoContent_delta`) 보존(FR-006)을 확인 — `public/app.js`
- [ ] T008 [US1] [새로고침] 버튼이 전체 페이지 리로드 없이 서버 최신값으로 에디터만 갱신하는지 확인(FR-005) — `public/app.js`
- [ ] T009 [US1] T004~T008 불일치 수정 — `public/app.js`
- [ ] T010 [US1] quickstart.md 시나리오 1~3 실행 후 SC-001, SC-002 확인

**Checkpoint**: User Story 1 독립적으로 동작

---

## Phase 4: User Story 2 - Google 캘린더 일정 관리 (Priority: P2)

**Goal**: Google 인증 후 일정 CRUD 및 공휴일 조회가 정상 동작

### Implementation for User Story 2

- [ ] T011 [US2] GIS OAuth2 Implicit Flow가 앱 구동 시 자동 실행되지 않고 사용자 동작 시에만 트리거되는지 확인(FR-010) — `public/app.js`
- [ ] T012 [US2] 사용자 캘린더 + 대한민국 공휴일 캘린더 병렬 조회(FR-007)가 contracts/api.md와 일치하는지 확인 — `public/app.js`
- [ ] T013 [P] [US2] 공휴일 이벤트가 읽기 전용으로 표시되는지(FR-008) 확인 — `public/app.js`
- [ ] T014 [US2] 일정 등록/수정/삭제(FR-009)가 각각 POST/PUT/DELETE로 정상 반영되는지 확인 — `public/app.js`
- [ ] T015 [US2] 401 토큰 만료 시 자동 재인증(FR-011)이 동작하는지 확인 — `public/app.js`
- [ ] T016 [US2] T011~T015 불일치 수정 — `public/app.js`
- [ ] T017 [US2] quickstart.md 시나리오 4~6 실행

**Checkpoint**: User Story 1, 2 모두 독립적으로 동작

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T018 숨김 탭 초기화 예외 케이스(Edge Case) 재확인 — `public/app.js`
- [ ] T019 quickstart.md 전체 시나리오(1~7) 최종 실행

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2(US1과 독립적으로 병렬 가능) → Polish

## Notes

- Google Calendar 관련 작업(US2)은 실제 Google 계정 인증이 필요하므로 검증 시 테스트 계정을 사용할 것을 권장.