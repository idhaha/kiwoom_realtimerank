# Implementation Plan: 동적 탭 — 사용자 정의 차트 탭

**Branch**: `005-dynamic-tabs` | **Date**: 2026-09-29 | **Spec**: specs/005-dynamic-tabs/spec.md

## Summary

동적 탭은 사용자가 자유롭게 추가하는 3가지 유형(차트 그리드, 해외종목 커스텀, 환율/금리 커스텀)의 탭이다. 차트 그리드는 TradingView/Investing.com 외부 iframe을 사용하고, 커스텀 탭은 서버 프록시(Finviz 이미지, TradingEconomics/FRED/ECOS 데이터)와 클라이언트 전용 문법 파서(`parseCustomCharts`)로 동작한다.

## Technical Context

**Language/Version**: Node.js >= 18(프록시), 브라우저 ES + Canvas(커스텀 차트 렌더링)

**Primary Dependencies**: axios(Finviz/TradingEconomics/ECOS 프록시), Python 3 + `fredapi`(또는 동등 패키지, `requirements.txt` 기준) — `GET /api/fred`는 `child_process.execFile()`로 프로젝트 루트의 `fred_api.py`를 인자 배열과 함께 서브프로세스 실행한다.

**Storage**: 탭 설정(문법 텍스트, 구획 색상 등)은 앱 설정 스냅샷의 일부로 `006-settings-sync`를 통해 저장(이 기능 자체는 저장 로직을 소유하지 않음)

**Testing**: 자동화 테스트 없음. quickstart.md로 수동 검증.

**Target Platform**: Oracle Cloud + PM2, 브라우저

**Project Type**: 웹 서비스

**Performance Goals**: 탭 추가 후 1초 이내 사용 가능(SC-001)

**FRED Cache Policy**: `/api/fred`는 시리즈/기간별 관측치와 마지막 사용 시각을 `data/fred-cache/cache.json`에 저장한다. 신규 키 또는 해당 월 첫 성공 조회는 요청 기간 전체를 가져오며, 월중 후속 조회는 최신 관측일 전 30일부터 증분 조회한 결과를 날짜 기준으로 병합한다. 월별 전체 조회 표식과 캐시는 서버 재시작 뒤에도 유지된다. 서버 시작과 실행 중 하루 한 번 1년간 사용되지 않은 시리즈의 모든 기간 캐시를 삭제하며, 입력에서 시리즈를 제거한 것만으로는 캐시를 지우지 않는다.

**Constraints**: 커스텀 문법은 엄격한 검증기가 아닌 휴리스틱 파서(정규식 기반 괄호/쉼표 분리)이며, 이 한계는 의도적으로 유지한다(spec의 Assumptions 참고). `fred_api.py`와 `requirements.txt`는 프로젝트 루트(`__dirname` 기준 상대경로로 실행됨)에 반드시 존재해야 하며, `dev_tools/`나 다른 하위 폴더로 옮기면 `/api/fred`가 즉시 실패한다(2026-09-29 실제 장애 발생 이력, `docs/analysis-log.md` 참고).

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
```

**Structure Decision**: 기존 구조 유지. 탭 유형별 렌더링 로직은 `app.js` 내 기존 함수들을 계속 확장.

## Complexity Tracking
해당 없음.
