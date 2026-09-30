# Tasks: 증시캘린더 탭 — 경제지표·실적 일정

**Input**: Design documents from `/specs/004-earnings-calendar-tab/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 브라운필드 검증 작업. quickstart.md로 검증.

## Phase 1: Setup

- [ ] T001 `GET /calendar` 및 `/api/toss_calendar_proxy` 라우트가 정상 등록되어 있는지 확인 — `server.js`

## Phase 2: Foundational

**⚠️ CRITICAL**

- [ ] T002 프록시 허용 호스트가 `tossinvest.com`, `toss.im` 하위 도메인으로 제한(FR-007)되어 있는지 확인 — `server.js`
- [ ] T003 [P] HTML `<base>` 태그 및 URL 변환 스크립트 삽입이 정상 동작하는지 확인(같은 출처 iframe 임베드 전제조건) — `server.js`

**Checkpoint**: 프록시 보안/임베드 기반 검증 완료

---

## Phase 3: User Story 1 - 경제지표·실적 일정 조회 (Priority: P1) 🎯 MVP

**Goal**: 당월 일정이 10초 이내 표시되고 필터가 정상 동작

**Independent Test**: 탭 진입 시 당월 일정 표시 및 유형/지역 필터 확인

### Implementation for User Story 1

- [ ] T004 [US1] 월별 일정 API(표시 월 ±3개월, 총 7개월) 프록시가 contracts/api.md와 일치하는지 확인(FR-001) — `server.js`
- [ ] T005 [P] [US1] 일정 유형(전체/경제지표/실적), 지역(전체/국내/해외) 필터(FR-002)가 동작하는지 확인 — 토스 임베드 내부 UI, `server.js` 프록시 응답 확인
- [ ] T006 [US1] 주별/월별 보기 전환(FR-003)이 정상 동작하는지 확인
- [ ] T007 [US1] 월 이동 시 인접 월 데이터가 정상 로드되는지 확인
- [ ] T008 [US1] T004~T007 불일치 수정 — `server.js`
- [ ] T009 [US1] quickstart.md 시나리오 1~4 실행 후 SC-001, SC-002 확인

**Checkpoint**: User Story 1 독립적으로 동작

---

## Phase 4: User Story 2 - 주간 AI 요약 확인 (Priority: P2)

**Goal**: 주간 AI 요약 카드가 정상 표시됨

### Implementation for User Story 2

- [ ] T010 [US2] 주간 AI 요약 API 프록시(FR-004)가 contracts/api.md와 일치하는지 확인 — `server.js`
- [ ] T011 [US2] T010 불일치 수정 — `server.js`
- [ ] T012 [US2] quickstart.md에서 요약 카드 표시 확인

**Checkpoint**: User Story 1, 2 모두 독립적으로 동작

---

## Phase 5: User Story 3 - 화면 새로고침 (Priority: P3)

**Goal**: 새로고침 버튼으로 iframe이 재로드되고 상태가 정확히 갱신됨

### Implementation for User Story 3

- [ ] T013 [US3] `refreshEarningsTab`의 about:blank → 원래 URL 재할당(100ms) 로직(FR-005)을 확인 — `public/app.js`
- [ ] T014 [US3] 캡처 모드 중 새로고침 억제(FR-008)가 동작하는지 확인 — `public/app.js`
- [ ] T015 [US3] T013~T014 불일치 수정 — `public/app.js`
- [ ] T016 [US3] quickstart.md 시나리오 5 실행 후 SC-003 확인

**Checkpoint**: 3개 User Story 모두 독립적으로 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T017 [P] 토스 원본 캘린더 새 창 열기 버튼(FR-006) 동작 확인 — `public/app.js`
- [ ] T018 quickstart.md 전체 시나리오 최종 실행

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2/US3(US1과 독립적으로 병렬 가능) → Polish

## Notes

- 이 기능은 외부 서비스(토스증권) 의존도가 높아, 검증 시점의 실제 응답 구조 변경 여부를 함께 기록해 둘 것을 권장.