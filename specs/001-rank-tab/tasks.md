# Tasks: Rank 탭 — 실시간 종목 순위 모니터링

**Input**: Design documents from `/specs/001-rank-tab/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 이 기능은 브라운필드(기존 구현) 검증 작업이므로 별도 자동화 테스트는 요청되지 않았다(Constitution 원칙 IV). 대신 quickstart.md 시나리오로 검증한다.

**Organization**: 사용자 스토리별로 그룹화. 각 스토리는 "코드가 spec/contracts와 일치하는지 검증 → 불일치 수정 → quickstart 확인" 순서를 따른다.

## Phase 1: Setup

- [ ] T001 `.env`에 `KIWOOM_APPKEY`, `KIWOOM_SECRETKEY`가 설정되어 있는지 확인 (루트 `.env`)
- [ ] T002 [P] `npm ci`로 `package.json` 의존성이 정상 설치되는지 확인

**Checkpoint**: 서버 실행 가능 상태 확보

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: 이 단계 완료 전에는 User Story 작업을 시작할 수 없음

- [ ] T003 Kiwoom OAuth 토큰 캐싱 로직(`cachedToken`, `tokenExpiryTime`)이 research.md의 "토큰 재사용, 무효화 시 즉시 폐기" 결정과 일치하는지 `server.js`에서 확인
- [ ] T004 [P] 시장 구분(KOSPI/KOSDAQ) 캐시가 4개 패널(거래대금/실시간순위/대주가능/관심종목)에서 공유되는지 `server.js`에서 확인 (data-model.md "관계 및 상태" 참고)
- [ ] T005 [P] 종목별 상세 조회 순차 처리 + 100ms 지연 로직이 `server.js`에 구현되어 있는지 확인 (FR-015)

**Checkpoint**: 공통 인프라 검증 완료 — User Story별 작업 시작 가능

---

## Phase 3: User Story 1 - 거래대금·실시간 조회 순위 확인 (Priority: P1) 🎯 MVP

**Goal**: 거래대금 상위·실시간 조회 순위 패널이 자동/수동 갱신되며 5초 이내 초기 표시

**Independent Test**: Rank 탭 진입 시 두 패널에 각 20개 항목이 표시되고, 새로고침 주기 변경/수동 조회가 동작하는지 확인

### Implementation for User Story 1

- [ ] T006 [US1] `GET /api/transaction_rank` 응답 필드가 contracts/api.md와 일치하는지 확인 (`rank`, `stk_cd`, `stk_nm`, `mkt_type`, `fluc_rt`, `trde_amt`, `concentration_rate`) — `server.js`
- [ ] T007 [US1] `GET /api/stock`의 rank 응답이 data-model.md의 WatchRankEntry 필드와 일치하는지 확인 — `server.js`
- [ ] T008 [P] [US1] 상위 20개 제한 및 시장 구분 색상 표시(FR-007, FR-009)가 렌더링되는지 확인 — `public/app.js`
- [ ] T009 [US1] 새로고침 주기 선택(`#refreshInterval`: 30초/1분/10분/1시간/당일누적)이 FR-002대로 동작하는지 확인 — `public/app.js`
- [ ] T010 [US1] 수동 조회 버튼(`#manualRefresh`)이 4개 패널을 동시에 갱신 시도하는지 확인 (FR-003) — `public/app.js`
- [ ] T011 [US1] 통신 실패 시 에러 상태 표시(FR-006)가 구현되어 있는지 확인 — `public/app.js`
- [ ] T012 [US1] T006~T011에서 발견된 spec 대비 불일치를 수정 — `server.js`, `public/app.js`
- [ ] T013 [US1] quickstart.md 시나리오 1~3 실행 후 SC-001, SC-002 충족 확인

**Checkpoint**: User Story 1 독립적으로 완전히 동작

---

## Phase 4: User Story 2 - 대주가능 종목 확인 (Priority: P2)

**Goal**: 한투 eFriend 연동으로 대주가능 종목을 등락률 순으로 표시하며, 키 미설정 시에도 서버가 정상 동작

**Independent Test**: `.env`에서 `EFRIEND_*`를 제거한 뒤에도 서버가 크래시 없이 빈 목록을 반환하는지 확인

### Implementation for User Story 2

- [ ] T014 [US2] `EFRIEND_*` 환경변수가 없을 때 `GET /api/stock`의 efriend 응답이 빈 배열을 반환하는지 확인 (FR-012) — `server.js`
- [ ] T015 [US2] 매매가능수량 강조 표시 및 매매가능금액(현재가×수량) 계산·표시(FR-011)를 확인 — `public/app.js`
- [ ] T016 [US2] T014~T015에서 발견된 불일치를 수정 — `server.js`, `public/app.js`
- [ ] T017 [US2] quickstart.md 시나리오 4 실행 후 FR-012 동작 확인

**Checkpoint**: User Story 1과 2가 모두 독립적으로 동작

---

## Phase 5: User Story 3 - 관심종목 하락률 순위 확인 (Priority: P3)

**Goal**: 사용자가 선택/입력한 관심종목 그룹의 하락률 상위 종목을 확인하고, 선택값이 유지됨

**Independent Test**: 관심종목 그룹을 변경한 뒤 새로고침해도 선택값이 유지되는지 확인

### Implementation for User Story 3

- [ ] T018 [US3] `GET /api/watchlist_groups`, `GET /api/watchlist_rank`가 contracts/api.md와 일치하는지 확인 — `server.js`
- [ ] T019 [US3] 관심종목 그룹 선택이 `localStorage`(`watchlist_selected_group`)에 저장·복원되는지 확인 (FR-014) — `public/app.js`
- [ ] T020 [US3] 그룹 ID 직접 입력이 드롭다운 선택보다 우선 적용되는지 확인 — `public/app.js`
- [ ] T021 [US3] T018~T020에서 발견된 불일치를 수정 — `server.js`, `public/app.js`
- [ ] T022 [US3] quickstart.md 시나리오 5 실행 후 SC-004 충족 확인

**Checkpoint**: 3개 User Story 모두 독립적으로 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T023 [P] 발견된 수정 사항 중 `docs/SYSTEM_SPECIFICATION.md` 1.1절 내용과 다른 부분이 있으면 문서 갱신
- [ ] T024 장 운영 시간 외 전일 마감 데이터 정상 표시(FR-017)를 4개 패널 모두에서 확인
- [ ] T025 캡처 모드 중 자동 갱신 중단(FR-018), 비활성 탭에서의 조용한 실패 처리(FR-019)를 `public/app.js`에서 확인
- [ ] T026 quickstart.md 전체 시나리오(1~6)를 순서대로 실행하여 SC-001~004 최종 확인

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작
- **Foundational (Phase 2)**: Setup 완료 후 진행 — 모든 User Story를 막는 선행 조건
- **User Stories (Phase 3~5)**: Foundational 완료 후 시작 가능. P1→P2→P3 순서 권장(우선순위 기준)이나, 서로 다른 엔드포인트를 다루므로 병렬 진행도 가능
- **Polish (Phase 6)**: 진행하고자 하는 모든 User Story 완료 후

### User Story Dependencies

- **US1 (P1)**: Foundational 이후 바로 시작 가능, 다른 스토리에 의존하지 않음
- **US2 (P2)**: Foundational 이후 바로 시작 가능, US1과 독립적(다른 엔드포인트)
- **US3 (P3)**: Foundational 이후 바로 시작 가능, US1/US2와 독립적(다른 엔드포인트)

### Parallel Opportunities

- T002는 독립적으로 병렬 가능
- T004, T005는 서로 다른 검증 대상이라 병렬 가능
- T008은 렌더링 검증이라 T006/T007(API 검증)과 병렬 가능
- US1/US2/US3는 서로 다른 엔드포인트·UI 영역을 다루므로 전체 병렬 진행 가능

---

## Implementation Strategy

### MVP First (User Story 1만)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료 (필수)
3. Phase 3: User Story 1 완료
4. **중단 후 검증**: quickstart.md 시나리오 1~3으로 US1 독립 검증
5. 필요 시 여기까지만 배포해도 핵심 가치 제공

### Incremental Delivery

1. Setup + Foundational → 기반 확보
2. US1 추가 → 독립 검증 (MVP)
3. US2 추가 → 독립 검증
4. US3 추가 → 독립 검증
5. Polish로 마무리

## Notes

- 이 tasks.md는 신규 코드 작성이 아니라 **기존 코드의 spec 준수 여부 검증 및 수정**이 목적이다(Constitution 원칙 I).
- 검증 중 실제로 스펙과 다른 동작을 발견하면, 어느 쪽이 맞는지(코드가 맞고 spec을 고쳐야 하는지, 코드를 고쳐야 하는지) 먼저 판단한 뒤 수정한다.
- 각 태스크 완료 후 커밋 권장.