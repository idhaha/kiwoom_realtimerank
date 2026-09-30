# Tasks: ADR 탭 — 등락비율 듀얼 차트

**Input**: Design documents from `/specs/002-adr-tab/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 브라운필드 검증 작업. 자동화 테스트 대신 quickstart.md로 검증.

## Phase 1: Setup

- [ ] T001 서버가 정상 기동되고 `/api/adr` 라우트가 등록되어 있는지 확인 — `server.js`

## Phase 2: Foundational

**⚠️ CRITICAL**: 이 단계 완료 전 User Story 작업 시작 불가

- [ ] T002 `extractArrayFromHtml`의 괄호 균형 스택 파싱 로직이 research.md의 "정규식 폴백 포함" 결정대로 구현되어 있는지 확인 — `public/app.js`
- [ ] T003 [P] `getCombinedRange`(Y축 공유 스케일 계산)가 두 시장 데이터를 올바르게 합산하는지 확인 — `public/app.js`

**Checkpoint**: 파싱/스케일 공통 로직 검증 완료

---

## Phase 3: User Story 1 - KOSPI/KOSDAQ ADR 듀얼 차트 비교 (Priority: P1) 🎯 MVP

**Goal**: 두 차트가 8초 이내 렌더링되고 기준선(80/100/120)이 정확히 표시됨

**Independent Test**: ADR 탭 진입 시 두 차트가 정상 렌더링되고 원천 실패 시에도 화면이 비지 않는지 확인

### Implementation for User Story 1

- [ ] T004 [US1] `GET /api/adr` 응답이 contracts/api.md의 원본 HTML 패스스루 계약과 일치하는지 확인 (타임아웃 8000ms) — `server.js`
- [ ] T005 [P] [US1] 80(주황 점선)/100(빨강 점선)/120(초록 점선) 기준선과 80~120 음영(FR-003)이 정확히 그려지는지 확인 — `public/app.js`
- [ ] T006 [US1] 원천 응답이 비정상(100자 미만/빈 배열)일 때 기존 렌더링 유지 + "업데이트 실패" 표시(FR-006)를 확인 — `public/app.js`
- [ ] T007 [US1] KOSPI/KOSDAQ 데이터 길이 불일치 시 안전한 클램핑(FR-007)이 동작하는지 확인 — `public/app.js`
- [ ] T008 [US1] T004~T007에서 발견된 불일치 수정 — `server.js`, `public/app.js`
- [ ] T009 [US1] quickstart.md 시나리오 1~3 실행 후 SC-001, SC-003 확인

**Checkpoint**: User Story 1 독립적으로 동작

---

## Phase 4: User Story 2 - 조회 기간 전환 (Priority: P2)

**Goal**: 6m/1y/2y/5y/10y 기간 전환이 1초 이내 반영됨

### Implementation for User Story 2

- [ ] T010 [US2] 기간 선택기 5개 옵션(기본값 2년/480일)이 FR-004대로 구현되어 있는지 확인 — `public/app.js`
- [ ] T011 [US2] 기간 전환 시 최신 데이터가 항상 우측 끝에 오도록 스크롤 오프셋이 재정렬되는지 확인 — `public/app.js`
- [ ] T012 [US2] T010~T011 불일치 수정 — `public/app.js`
- [ ] T013 [US2] quickstart.md 시나리오 3(기간 버튼) 실행 후 SC-002 확인

**Checkpoint**: User Story 1, 2 모두 독립적으로 동작

---

## Phase 5: User Story 3 - 두 차트 커서·줌 동기화 (Priority: P3)

**Goal**: 한쪽 차트의 호버/패닝/줌이 반대편 차트에 실시간 동기화됨

### Implementation for User Story 3

- [ ] T014 [US3] `syncToKosdaq`/`syncToKospi` 커서 동기화(FR-005)가 `requestAnimationFrame` 기반으로 지연 없이 동작하는지 확인 — `public/app.js`
- [ ] T015 [US3] 패닝/스크롤바/휠 줌 동기화가 1:1로 일치하는지 확인 — `public/app.js`
- [ ] T016 [US3] T014~T015 불일치 수정 — `public/app.js`
- [ ] T017 [US3] quickstart.md 시나리오 4 실행 후 동기화 확인

**Checkpoint**: 3개 User Story 모두 독립적으로 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 시세 지표 갱신 시 `saveAppData()`가 호출되지 않는지 확인(FR-008, 006-settings-sync와의 경계 확인) — `public/app.js`
- [ ] T019 [P] 비활성 탭 상태에서 캔버스 재렌더링 지연(FR-009)이 실제로 동작하는지 확인 — `public/app.js`
- [ ] T020 quickstart.md 전체 시나리오 최종 실행

## Dependencies & Execution Order

- Setup → Foundational → US1/US2/US3(병렬 가능, 서로 다른 UI 영역) → Polish

## Notes

- 기존 코드의 spec 준수 여부 검증 및 수정이 목적(Constitution 원칙 I).