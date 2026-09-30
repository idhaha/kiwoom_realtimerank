# Implementation Plan: Rank 탭 — 실시간 종목 순위 모니터링

**Branch**: `001-rank-tab` | **Date**: 2026-09-29 | **Spec**: specs/001-rank-tab/spec.md

**Input**: Feature specification from `/specs/001-rank-tab/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Rank 탭은 거래대금 상위(키움), 실시간 조회 순위(키움), 대주가능 종목(한투 eFriend), 관심종목 하락률 순위 4개 패널을 하나의 화면에서 자동/수동 갱신으로 제공한다. 이미 `server.js`(백엔드 프록시·집계)와 `public/app.js`(프론트엔드 렌더링)로 구현·운영 중이며, 본 계획은 기존 아키텍처를 유지한 채 spec의 요구사항과 코드 간 정합성을 정리하는 것을 목적으로 한다.

## Technical Context

**Language/Version**: JavaScript (Node.js >= 18, CommonJS), 브라우저 ES 문법(빌드 단계 없음)

**Primary Dependencies**: express ^4.18.2(백엔드 라우팅), axios ^1.6.0(외부 API 호출), cors ^2.8.5, dotenv ^16.3.1(환경변수)

**Storage**: 영속 저장소 없음. 인증 토큰 및 시장구분 캐시는 서버 프로세스 메모리(변수/Map)에 보관하며, 서버 재시작 시 초기화된다.

**Testing**: 현재 자동화된 테스트 없음. Constitution 원칙 IV(Solo-Maintainer Simplicity)에 따라 수동 검증(quickstart.md)으로 대체한다. 자동화 테스트 도입은 이번 계획 범위 밖이며 필요 시 별도 과제로 분리한다.

**Target Platform**: Oracle Cloud Free Tier(Ubuntu) 서버에서 PM2로 상시 구동, 브라우저(데스크톱/모바일 반응형)로 접근

**Project Type**: 웹 서비스 — 단일 Express 서버가 API와 정적 프론트엔드(`public/`)를 함께 서빙

**Performance Goals**: 초기 로드 5초 이내(SC-001), 자동 갱신 주기 오차 ±5초 이내(SC-002)

**Constraints**: 키움증권 REST API 초당 요청 제한(약 5회) 준수를 위해 종목별 상세 조회는 순차 처리 + 100ms 지연 적용. 각 패널 표시는 최대 20개 항목으로 제한.

**Scale/Scope**: 1인 운영자 기준 소규모 트래픽(동시 접속 수 명 이내로 가정). 대규모 동시 사용자 대응은 범위 밖.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-First Documentation**: PASS — 본 plan은 spec.md와 실제 `server.js`/`public/app.js` 동작을 근거로 작성했다.
- **II. External API Resilience**: PASS — 기존 구현이 이미 한투 키 누락 시 빈 배열 반환, 시세 조회 실패 시 개별 패널만 실패 처리하는 방식을 따르고 있으며 본 계획도 이를 그대로 유지한다.
- **III. Secrets Isolation**: PASS — 키움/한투 API 키는 `.env`에서만 읽으며, 이 기능 구현에 새로운 민감정보 저장소를 추가하지 않는다.
- **IV. Solo-Maintainer Simplicity**: PASS — 새로운 프레임워크, DB, 메시지 큐 등 추가 없이 기존 Express 단일 서버 구조를 그대로 사용한다.
- **V. Agent-Agnostic Workflow**: PASS — 모든 산출물(spec, plan, research, data-model, contracts, quickstart)은 일반 Markdown이다.

위반 사항 없음 — Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/001-rank-tab/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
server.js                    # Express 백엔드 — Rank 관련 라우트:
                              #   GET /api/transaction_rank
                              #   GET /api/stock
                              #   GET /api/watchlist_groups
                              #   GET /api/watchlist_rank
public/
├── index.html                # tab_rank 마크업 포함
├── app.js                    # Rank 패널 렌더링/자동갱신 로직 (loadData, loadTransactionRank 등)
└── style.css                 # Rank 테이블/상태 표시 스타일
docs/
├── SYSTEM_SPECIFICATION.md    # 1.1절 = 이 기능의 원본 사양
└── reference/                 # 키움/한투 API 참고문서
.env                          # KIWOOM_APPKEY, KIWOOM_SECRETKEY, EFRIEND_* (git 미포함)
```

**Structure Decision**: 별도 프론트엔드/백엔드 분리 없이, 기존 단일 저장소·단일 Express 프로세스 구조를 그대로 유지한다(Option 1: Single project 변형 — 빌드 단계 없는 정적 프론트엔드를 백엔드가 직접 서빙). Rank 기능을 위한 새 디렉토리나 모듈 분리는 만들지 않으며, `server.js`와 `public/app.js` 내 기존 함수를 계속 확장한다.

## Complexity Tracking

> 해당 없음 — Constitution Check 위반 없음.