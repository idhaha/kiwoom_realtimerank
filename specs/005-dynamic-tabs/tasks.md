# Tasks: 동적 탭 — 사용자 정의 차트 탭

**Input**: Design documents from `/specs/005-dynamic-tabs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 브라운필드 검증 작업. quickstart.md로 검증.

## Phase 1: Setup

- [ ] T001 `+` 메뉴 및 3가지 탭 유형 생성 UI가 정상 렌더링되는지 확인 — `public/index.html`, `public/app.js`

## Phase 2: Foundational

**⚠️ CRITICAL**

- [ ] T002 동적 탭 ID 생성 규칙(생성 시각 기반)과 `tabData[id]` 저장 구조(data-model.md DynamicTab)가 일치하는지 확인 — `public/app.js`
- [ ] T003 [P] 개별 데이터 소스 실패가 탭 전체에 영향을 주지 않는 격리 구조(FR-007)가 공통으로 적용되어 있는지 확인 — `public/app.js`
- [ ] T003a `fred_api.py`, `requirements.txt`가 프로젝트 루트에 존재하고 `pip install -r requirements.txt`로 의존성이 설치되어 있는지 확인 — 루트 디렉토리 (dev_tools로 이동 시 `/api/fred` 즉시 실패, docs/analysis-log.md 참고)

**Checkpoint**: 탭 생명주기/격리 공통 로직 검증 완료

---

## Phase 3: User Story 1 - 차트 그리드 탭 추가 (Priority: P1) 🎯 MVP

**Goal**: 차트 그리드 탭 추가 후 1초 이내 사용 가능, TradingView/Investing.com 전환 가능

**Independent Test**: `+` → `Dynamic 차트` 선택 시 기본 심볼 4종이 채워지는지 확인

### Implementation for User Story 1

- [ ] T004 [US1] 기본 심볼 4종(`FX_IDC:USDKRW`, `KRX:KOSPI`, `KRX:KOSDAQ`, `BINANCE:BTCUSDT`, FR-002)이 정확한지 확인 — `public/app.js`
- [ ] T005 [P] [US1] TradingView ↔ Investing.com 전환(FR-003)이 셀의 `mode`/`mainSrc`/`subSrc`(data-model.md GridCell)에 정확히 반영되는지 확인 — `public/app.js`
- [ ] T006 [US1] 심볼 입력 후 [이동] 클릭 시 `getDirectTradingViewUrl` 임베드 갱신을 확인 — `public/app.js`
- [ ] T007 [US1] 새 탭이 생성 직후 활성화되고 저장되는지(FR-005) 확인 — `public/app.js`
- [ ] T008 [US1] T004~T007 불일치 수정 — `public/app.js`
- [ ] T009 [US1] quickstart.md 시나리오 1~3 실행 후 SC-001 확인

**Checkpoint**: User Story 1 독립적으로 동작

---

## Phase 4: User Story 2 - 해외종목/환율·금리 커스텀 탭 (Priority: P2)

**Goal**: 사용자 정의 문법으로 여러 데이터 소스를 구획별로 렌더링

### Implementation for User Story 2

- [ ] T010 [US2] `parseCustomCharts` 문법 파싱(구획, 쌍/삼중항 판별)이 spec.md의 문법 예시대로 동작하는지 확인 — `public/app.js`
- [ ] T011 [P] [US2] Finviz/TradingEconomics/FRED/ECOS 프록시(FR-004, contracts/api.md)가 정상 응답하는지 확인 — `server.js`
- [ ] T012 [US2] 개별 항목 실패 시 나머지 항목이 정상 로드되는지(FR-007) 확인 — `public/app.js`
- [ ] T013 [US2] 빈 설정 시 "등록된 차트가 없습니다" 안내가 표시되는지 확인 — `public/app.js`
- [ ] T014 [US2] T010~T013 불일치 수정 — `server.js`, `public/app.js`
- [ ] T015 [US2] quickstart.md 시나리오 4~5 실행 후 SC-002, SC-003 확인

**Checkpoint**: User Story 1, 2 모두 독립적으로 동작

---

## Phase 5: User Story 3 - 동적 탭 관리 (Priority: P3)

**Goal**: 드래그 순서 변경, 더블클릭 이름 변경, 우클릭 삭제가 정상 동작

### Implementation for User Story 3

- [ ] T016 [US3] 드래그 순서 변경 결과가 저장되는지(FR-006) 확인 — `public/app.js`
- [ ] T017 [US3] 더블클릭 이름 변경 및 고정 탭 제외 처리(FR-006)를 확인 — `public/app.js`
- [ ] T018 [US3] 우클릭 삭제 확인 대화상자 및 데이터 정리(FR-006)를 확인 — `public/app.js`
- [ ] T019 [US3] T016~T018 불일치 수정 — `public/app.js`
- [ ] T020 [US3] quickstart.md 시나리오 6 실행

**Checkpoint**: 3개 User Story 모두 독립적으로 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T021 [P] 캡처 모드 중 동적 탭 로드/새로고침 억제(FR-009) 확인 — `public/app.js`
- [ ] T022 같은 탭 내 캔버스 차트 간 커서/줌 동기화 범위(FR-008)가 외부 iframe까지 확장되지 않음을 확인 — `public/app.js`
- [ ] T023 quickstart.md 전체 시나리오 최종 실행

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2(US1과 독립적) → US3(탭 존재 전제, US1/US2 완료 후 검증 권장) → Polish

## Notes

- 커스텀 문법 파서는 휴리스틱 기반임을 검증 시 전제하고, "의도와 다르게 해석되는" 사례는 버그가 아니라 문서화된 한계(Assumptions)로 분류한다.