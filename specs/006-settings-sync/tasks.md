# Tasks: 설정 저장 및 동기화

**Input**: Design documents from `/specs/006-settings-sync/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 브라운필드 검증 작업. quickstart.md로 검증.

## Phase 1: Setup

- [ ] T001 `user_settings.json`이 `.gitignore`에 포함되어 있는지 확인(Constitution 원칙 III) — `.gitignore`

## Phase 2: Foundational

**⚠️ CRITICAL**

- [ ] T002 `getSerializedState()`가 data-model.md의 AppSettingsSnapshot 필드를 모두 포함하는지 확인 — `public/app.js`
- [ ] T003 [P] `GET/POST /api/settings`가 contracts/api.md와 일치하는지(캐시 방지 헤더, 50MB 한도) 확인 — `server.js`

**Checkpoint**: 저장 스냅샷 구조 검증 완료

---

## Phase 3: User Story 1 - 설정 자동 저장 (Priority: P1) 🎯 MVP

**Goal**: 구성 변경 시 로컬 즉시 기록 후 서버 저장이 자동 발생

**Independent Test**: 탭 이름 변경 후 새로고침해도 유지되는지 확인

### Implementation for User Story 1

- [ ] T004 [US1] `saveAppData()`가 탭 추가/삭제/이름변경/순서변경/차트입력/간격변경/관심종목변경/메모저장 시 호출되는지(FR-001) 확인 — `public/app.js`
- [ ] T005 [P] [US1] 로컬 저장 → 서버 전송 순서(FR-002)가 정확히 지켜지는지 확인 — `public/app.js`
- [ ] T006 [US1] 서버 저장 실패 시 로컬 유지 + 사용자 경고(FR-003)를 확인 — `public/app.js`
- [ ] T007 [US1] `isInitializing` 중 자동 저장 잠금(FR-007)이 동작하는지 확인 — `public/app.js`
- [ ] T008 [US1] T004~T007 불일치 수정 — `public/app.js`
- [ ] T009 [US1] quickstart.md 시나리오 1~2 실행 후 SC-001 확인

**Checkpoint**: User Story 1 독립적으로 동작

---

## Phase 4: User Story 2 - 여러 PC 간 설정 동기화 (Priority: P2)

**Goal**: 시작 시 서버 설정 우선 적용, 서버 접근 불가 시 로컬 폴백

### Implementation for User Story 2

- [ ] T010 [US2] 서버에 비어있지 않은 `tabs`가 있으면 무조건 서버 데이터를 우선 채택(FR-004)하는지 확인 — `public/app.js`
- [ ] T011 [US2] 서버 접근 실패 시 유효한 로컬 설정으로 대체(FR-005)되는지 확인 — `public/app.js`
- [ ] T012 [US2] 서버·로컬 모두 없을 때 고정 탭+기본 Rank로 시작(FR-006)하는지 확인 — `public/app.js`
- [ ] T013 [US2] T010~T012 불일치 수정 — `public/app.js`
- [ ] T014 [US2] quickstart.md 시나리오 2~3 실행 후 SC-002, SC-003 확인

**Checkpoint**: User Story 1, 2 모두 독립적으로 동작

---

## Phase 5: User Story 3 - 전체 설정 백업/복원 (Priority: P3)

**Goal**: TXT+JSON 내보내기, JSON 백업으로 전체 복원

### Implementation for User Story 3

- [ ] T015 [US3] 사용자 정의 탭이 하나 이상 있을 때만 내보내기 진행(없으면 안내 후 종료)이 FR-009대로 동작하는지 확인 — `public/app.js`
- [ ] T016 [P] [US3] TXT/JSON 파일이 순차(약 100ms 간격)로 다운로드되는지 확인 — `public/app.js`
- [ ] T017 [US3] 사용자 정의 탭 단일 TXT export/import(FR-008)가 다른 탭에 영향 주지 않는지 확인 — `public/app.js`
- [ ] T018 [US3] JSON 전체 백업 복원 시 확인 절차(FR-010)를 거치는지, `tabs`/`contents` 필드 존재 여부로 전체 백업을 판별하는지 확인 — `public/app.js`
- [ ] T019 [US3] T015~T018 불일치 수정 — `public/app.js`
- [ ] T020 [US3] quickstart.md 시나리오 4~6 실행 후 SC-004 확인

**Checkpoint**: 3개 User Story 모두 독립적으로 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T021 서버가 API 키 등 민감정보를 `user_settings.json`에 저장하지 않는지 재확인(Constitution 원칙 III, FR-011) — `server.js`
- [ ] T022 [P] 동시 저장 충돌 시 "마지막 저장 우선" 동작(FR-012)이 문서화된 한계로 명확히 기록되어 있는지 확인 — `docs/SYSTEM_SPECIFICATION.md` 3.4절과 대조
- [ ] T023 quickstart.md 전체 시나리오 최종 실행

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2(US1 전제) → US3(US1/US2와 독립적으로 병렬 가능) → Polish

## Notes

- FR-012(동시 저장 시 마지막 저장 우선, 병합 없음)는 현재 정책으로 "수정 대상 버그"가 아니라 "문서화된 한계"로 취급한다. 다중 사용자 확장이 실제 필요해지면 별도 spec으로 분리해 재설계할 것.