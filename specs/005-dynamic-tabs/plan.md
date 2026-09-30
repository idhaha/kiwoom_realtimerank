# Implementation Plan: 동적 탭 — 사용자 정의 차트 탭

**Branch**: `005-dynamic-tabs` | **Date**: 2026-09-29 | **Spec**: specs/005-dynamic-tabs/spec.md

## Summary

동적 탭은 사용자가 자유롭게 추가하는 3가지 유형(차트 그리드, 해외종목 커스텀, 환율/금리 커스텀)의 탭이다. 차트 그리드는 TradingView/Investing.com 외부 iframe을 사용하고, 커스텀 탭은 서버 프록시(Finviz 이미지, TradingEconomics/FRED/ECOS 데이터)와 클라이언트 전용 문법 파서(`parseCustomCharts`)로 동작한다.

## Technical Context

**Language/Version**: Node.js >= 18(프록시), 브라우저 ES + Canvas(커스텀 차트 렌더링)

**Primary Dependencies**: axios(Finviz/TradingEconomics/FRED/ECOS 프록시)

**Storage**: 탭 설정(문법 텍스트, 구획 색상 등)은 앱 설정 스냅샷의 일부로 `006-settings-sync`를 통해 저장(이 기능 자체는 저장 로직을 소유하지 않음)

**Testing**: 자동화 테스트 없음. quickstart.md로 수동 검증.

**Target Platform**: Oracle Cloud + PM2, 브라우저

**Project Type**: 웹 서비스

**Performance Goals**: 탭 추가 후 1초 이내 사용 가능(SC-001)

**Constraints**: 커스텀 문법은 엄격한 검증기가 아닌 휴리스틱 파서(정규식 기반 괄호/쉼표 분리)이며, 이 한계는 의도적으로 유지한다(spec의 Assumptions 참고).

**Scale/Scope**: 1인 사용자, 탭 개수 제한 없음(문서화된 제한 없음)

## Constitution Check

- **I. Spec-First**: PASS
- **II. External API Resilience**: PASS — 개별 데이터 소스 실패가 탭 전체를 중단시키지 않는 기존 동작 유지.
- **III. Secrets Isolation**: PASS — 이 기능에서 사용하는 프록시들은 공개 API 또는 API 키가 이미 다른 기능(FRED/ECOS는 `.env`)에서 관리됨. 새 민감정보 없음.
- **IV. Solo-Maintainer Simplicity**: PASS — 정규식 기반 휴리스틱 파서를 정식 문법 파서(AST 기반)로 교체하는 것은 이번 범위에 포함하지 않음(YAGNI, 현재 문제를 일으키지 않음).
- **V. Agent-Agnostic Workflow**: PASS

위반 없음.

## Project Structure

### Documentation (this feature)
```text
specs/005-dynamic-tabs/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
└── quickstart.md
```

### Source Code (repository root)
```text
server.js                 # GET /api/finviz-image, GET /api/trading-economics,
                           # FRED/ECOS 프록시 라우트
public/
├── index.html             # + 메뉴, 그리드/커스텀 탭 템플릿
├── app.js                 # parseCustomCharts, 그리드 셀 로직, 탭 생명주기 관리
└── style.css
docs/SYSTEM_SPECIFICATION.md  # 2장
```

**Structure Decision**: 기존 구조 유지. 탭 유형별 렌더링 로직은 `app.js` 내 기존 함수들을 계속 확장.

## Complexity Tracking
해당 없음.