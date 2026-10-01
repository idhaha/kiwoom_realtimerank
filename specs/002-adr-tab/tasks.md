# Tasks: ADR 탭 — 등락비율 듀얼 차트

**Input**: Design documents from `/specs/002-adr-tab/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 브라운필드 검증 작업. 자동화 테스트 대신 quickstart.md로 검증.

## Phase 1: Setup

- [x] T001 서버가 정상 기동되고 `/api/adr` 라우트가 등록되어 있는지 확인 — `server.js`

## Phase 2: Foundational

**⚠️ CRITICAL**: 이 단계 완료 전 User Story 작업 시작 불가

- [x] T002 `extractArrayFromHtml`의 괄호 균형 스택 파싱 로직이 research.md의 "정규식 폴백 포함" 결정대로 구현되어 있는지 확인 — `public/app.js`
- [x] T003 [P] `getCombinedRange`(Y축 공유 스케일 계산)가 두 시장 데이터를 올바르게 합산하는지 확인 — `public/app.js`

**Checkpoint**: 파싱/스케일 공통 로직 검증 완료

---

## Phase 3: User Story 1 - KOSPI/KOSDAQ ADR 듀얼 차트 비교 (Priority: P1) 🎯 MVP

**Goal**: 두 차트가 8초 이내 렌더링되고 기준선(80/100/120)이 정확히 표시됨

**Independent Test**: ADR 탭 진입 시 두 차트가 정상 렌더링되고 원천 실패 시에도 화면이 비지 않는지 확인

### Implementation for User Story 1

- [x] T004 [US1] `GET /api/adr` 응답이 contracts/api.md의 원본 HTML 패스스루 계약과 일치하는지 확인 (타임아웃 8000ms) — `server.js`
- [x] T005 [P] [US1] 80(주황 점선)/100(빨강 점선)/120(초록 점선) 기준선과 80~120 음영(FR-003)이 정확히 그려지는지 확인 — `public/app.js`
- [x] T006 [US1] 원천 응답이 비정상(100자 미만/빈 배열)일 때 기존 렌더링 유지 + "업데이트 실패" 표시(FR-006)를 확인 — `public/app.js`
- [x] T007 [US1] 서로 다른 길이의 KOSPI/KOSDAQ 합성 입력으로 표시 범위 및 양방향 날짜 동기화 클램핑을 확인 — `public/app.js`
- [x] T008 [US1] T004~T007에서 발견된 불일치 수정 — `server.js`, `public/app.js`
- [x] T009 [US1] quickstart.md 시나리오 1~3 실행 후 SC-001, SC-003 확인

**Checkpoint**: User Story 1 독립적으로 동작

---

## Phase 4: User Story 2 - 조회 기간 전환 (Priority: P2)

**Goal**: 6m/1y/2y/5y/10y 기간 전환이 1초 이내 반영됨

### Implementation for User Story 2

- [x] T010 [US2] 기간 선택기 5개 옵션(기본값 2년/480일)이 FR-004대로 구현되어 있는지 확인 — `public/app.js`
- [x] T011 [US2] 기간 전환 시 최신 데이터가 항상 우측 끝에 오도록 스크롤 오프셋이 재정렬되는지 확인 — `public/app.js`
- [x] T012 [US2] T010~T011 불일치 수정 — `public/app.js`
- [x] T013 [US2] quickstart.md 시나리오 3(기간 버튼) 실행 후 SC-002 확인

**Checkpoint**: User Story 1, 2 모두 독립적으로 동작

---

## Phase 5: User Story 3 - 두 차트 커서·줌 동기화 (Priority: P3)

**Goal**: 한쪽 차트의 호버/패닝/줌이 반대편 차트에 실시간 동기화됨

### Implementation for User Story 3

- [x] T014 [US3] `syncToKosdaq`/`syncToKospi` 커서 동기화(FR-005)가 `requestAnimationFrame` 기반으로 지연 없이 동작하는지 확인 — `public/app.js`
- [x] T015 [US3] 패닝/스크롤바/휠 줌 동기화가 1:1로 일치하는지 확인 — `public/app.js`
- [x] T016 [US3] T014~T015 불일치 수정 — `public/app.js`
- [x] T017 [US3] quickstart.md 시나리오 4 실행 후 동기화 확인

**Checkpoint**: 3개 User Story 모두 독립적으로 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T018 시세 지표 갱신 시 `saveAppData()`가 호출되지 않는지 확인(FR-008, 006-settings-sync와의 경계 확인) — `public/app.js`
- [x] T019 [P] 비활성 탭 상태에서 캔버스 재렌더링 지연(FR-009)이 실제로 동작하는지 확인 — `public/app.js`
- [x] T020 quickstart.md 전체 시나리오 최종 실행

## Dependencies & Execution Order

- Setup → Foundational → US1/US2/US3(병렬 가능, 서로 다른 UI 영역) → Polish

## Notes

- 기존 코드의 spec 준수 여부 검증 및 수정이 목적(Constitution 원칙 I).

---

## Verification Log

> 2026-10-01 기준 코드 및 localhost 브라우저 검증 기록.

### Completed / Confirmed

- **T001 🟢** — `server.js`에 `GET /api/adr` 라우트가 등록되어 있고 `axios.get(http://adrinfo.kr/chart...)` 프록시 구조가 확인된다. 요청 timeout은 8000ms로 설정되어 있다.
- **T002 🟢** — `extractArrayFromHtml()`에서 `[`/`]` 균형을 스택 카운터 방식으로 추적한 뒤 `JSON.parse()`를 시도하고, 실패 시 정규식 폴백을 수행한다.
- **T003 🟢** — `getCombinedRange()`가 KOSPI/KOSDAQ 각각에 대해 offset을 데이터 길이에 맞게 clamp한 뒤 두 배열의 값을 합산하여 공통 min/max를 계산한다.
- **T004 🟢** — `/api/adr`는 원본 응답을 `res.send(response.data)`로 그대로 전달하고 timeout은 8000ms이다.
- **T005 🟢** — `drawLineChart()`에 80/100/120 기준선과 80~120 구간 음영이 구현되어 있다. 기준선은 각각 주황/빨강/초록 점선으로 그린다.
- **T006 🟢** — 응답 길이 미달/빈 시장 데이터는 캐시 갱신 전에 실패 경로로 보내도록 수정했다. 사용자가 localhost에서 실패 시 차트 보존과 `업데이트 실패` 상태를 확인했다.
- **T007 🟢** — `drawLineChart()`에서 표시 기간을 데이터 길이로 제한하고 `getCombinedRange()` 각 시장 배열도 자체 범위로 clamp함을 확인했다. 실제 production `renderAdr()`/`drawLineChart()` 함수를 격리 실행하고 길이 12/7의 합성 데이터를 넣어 초기 오프셋, 유한한 공유 Y축 범위, 긴→짧은/짧은→긴 양방향 동기화의 범위 제한을 통과했다. 서버·설정 파일은 변경하지 않았다.
- **T008 🟢** — 초기 빈 ADR 응답 보존 및 실패 표시, 안전한 기간 기본값, 휠/커서/패닝 동기화, 비활성 탭 지연 렌더링 불일치를 코드에서 수정했다. 차트 이벤트 리스너가 자동 갱신 후에도 최신 데이터 배열을 참조하도록 보완했다.
- **T011 🟢** — 기간 버튼 클릭 시 각 차트의 `scrollOffset`을 `데이터 길이 - 기간 거래일 수`로 재설정하여 최신 데이터가 우측 끝에 오도록 처리한다.
- **T010/T012 🟢** — ADR 기간 기본값이 기존 1y/500일 표시에서 2y/480 거래일로 어긋나 있던 부분을 양 차트 모두 수정했다.
- **T013 🟢** — localhost 브라우저에서 초기 ADR 데이터 표시와 2y 기본 선택을 확인했다. 6m/1y/2y/5y/10y를 모두 클릭해 양쪽 차트의 선택 버튼이 함께 바뀌는 것을 확인했다. 각 전환은 1초 이내 완료됐다. 확인 후 2y를 다시 선택했다.
- **T014 🟢** — 날짜 기준 nearest-index 매핑 코드를 확인했고 사용자가 양쪽 차트의 hover 십자선 동기화를 통과로 확인했다.
- **T009 🟢** — 정상 데이터의 8초 이내 표시는 기존 localhost 확인으로 통과했고, 사용자가 비정상 응답 시 차트 보존/실패 상태를 통과로 확인했다.
- **T015 🟢** — localhost에서 K 차트 패닝과 하단 스크롤바 조작 시 두 차트의 데이터/스크롤 위치가 함께 변하는 것을 확인했다. K 차트에서 휠 확대 시 두 차트 스크롤바의 길이가 함께 줄어 양쪽 줌 동기화를 확인했다. 검증 후 새로고침해 ADR 화면을 기본 2y 상태로 복원했다.
- **T016 🟢** — US3의 실제 입력 검증은 남아 있으나, 코드에서 확인된 휠 동기화 누락과 길이 차이에 따른 단순 index 동기화는 날짜 기준 매핑으로 수정했다.
- **T018 🟢** — `updateAdrFromSource()` 자체에서는 `saveAppData()`를 호출하지 않는다. ADR 시세 갱신 자체가 설정 저장을 직접 트리거하는 경로는 확인되지 않았다.
- **T017 🟢** — 사용자가 quickstart 시나리오의 차트 십자선 동기화 검증을 통과로 확인했다. 패닝 동기화도 브라우저에서 별도로 확인했다.
- **T019 🟢** — 30초 갱신 주기 검증에서 Rank 탭을 띄운 사이 ADR 조회 시각이 갱신됐고, ADR 복귀 후 차트가 표시됐다. 코드상 비활성 분기는 canvas 렌더링을 보류한다.
- **T020 🟢** — quickstart 전체 시나리오를 완료했다. 정상 데이터 표시/기간 전환/커서 동기화는 브라우저에서 확인했고, 실패 시 차트 보존은 사용자가 통과로 확인했다.

### Mismatches Found

- **T006 🔴** — (해결 및 사용자 재검증 완료) 짧은 응답뿐 아니라 파싱된 KOSPI/KOSDAQ 데이터가 비어 있는 응답도 캐시 갱신 전에 실패 처리하도록 수정했다. 실패 시 기존 차트를 유지하고 상태를 `업데이트 실패`로 표시한다.
- **T007 🟠** — 길이 불일치 시 범위 밖 접근을 막도록 clamp한다. 다만 서로 길이가 다른 입력을 이용한 동작 검증은 남아 있다.
- **T006 🔴** — (해결) 파싱 결과의 두 시장 중 하나라도 비어 있으면 저장된 기존 ADR 데이터를 유지하고 `업데이트 실패` 상태를 표시하도록 수정했다.
- **T010 🔴** — (해결) 버튼 기본값과 canvas 초기 표시 수를 2y/480 거래일로 맞췄다.
- **T014 🟠** — (해결 및 사용자 검증 완료) 양방향 cursor sync에서 단순 index 복사를 날짜 기준 nearest-index 매핑으로 바꿨다.
- **T015 🔴** — (해결 및 브라우저 검증 완료) 휠 입력을 포인터 기준 줌으로 바꾸고 동일 visibleCount/start date를 peer chart에 전달한다.
- **T019 🔴** — (해결 및 브라우저 확인 완료) 비활성 탭에서는 응답 데이터 캐시만 갱신하고 탭 복귀 시 canvas를 그린다.

### Pending Runtime Verification

- **T007** — KOSPI/KOSDAQ 실제 길이 불일치 데이터를 넣어 안전한 클램핑을 확인해야 한다.

### Current Next Step

- T007은 서로 다른 길이의 합성 입력으로 클램핑을 검증해 완료했다. 다음 남은 범위는 003-memo-tab 검증이다.
- 001-rank-tab의 T024는 사용자 요청으로 추후 재검증 때까지 보류한다.
