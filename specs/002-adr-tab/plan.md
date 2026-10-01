# Implementation Plan: ADR 탭 — 등락비율 듀얼 차트

**Branch**: `002-adr-tab` | **Date**: 2026-09-29 | **Spec**: specs/002-adr-tab/spec.md

**Input**: Feature specification from `/specs/002-adr-tab/spec.md`

## Summary

ADR 탭은 외부 사이트(adrinfo.kr)를 서버가 프록시해 HTML을 받아오고, 브라우저에서 괄호 균형 파싱으로 시계열 데이터를 추출해 두 개의 동기화된 HTML5 Canvas 차트로 렌더링한다. 신규 개발이 아닌 기존 구현 문서화이며, CORS 우회용 프록시 구조와 클라이언트 파싱/렌더링 구조를 그대로 유지한다.

## Technical Context

**Language/Version**: Node.js >= 18(백엔드 프록시), 브라우저 ES + Canvas API(프론트엔드)

**Primary Dependencies**: axios(프록시 fetch), 프론트엔드는 순수 Canvas 2D — 별도 차트 라이브러리 미사용

**Storage**: 없음. 파싱된 시계열은 `tabData['tab_adr'].adr`에 메모리 캐시.

**Testing**: 자동화 테스트 없음(Constitution IV). quickstart.md로 수동 검증.

**Target Platform**: Oracle Cloud + PM2, 브라우저

**Project Type**: 웹 서비스(단일 Express 서버 + 정적 프론트엔드)

**Performance Goals**: 초기 렌더링 8초 이내(SC-001), 기간 전환 1초 이내(SC-002)

**Constraints**: 원천 사이트 응답 파싱 실패 시 기존 렌더링 유지(빈 화면 금지). 정규식 ReDoS 방지를 위해 괄호 균형 스택 알고리즘 사용.

**Scale/Scope**: 1인 운영자, 소규모 트래픽

## Constitution Check

- **I. Spec-First**: PASS — spec.md 및 `server.js`/`public/app.js` 기준.
- **II. External API Resilience**: PASS — 파싱 실패 시 기존 화면 유지, 실패를 "업데이트 실패" 상태로만 표시.
- **III. Secrets Isolation**: PASS — 이 기능은 API 키를 사용하지 않음(공개 사이트 프록시).
- **IV. Solo-Maintainer Simplicity**: PASS — 차트 라이브러리 없이 순수 Canvas로 이미 구현되어 있으며 유지.
- **V. Agent-Agnostic Workflow**: PASS — 산출물 전부 Markdown.

위반 없음.

## Project Structure

### Documentation (this feature)
```text
specs/002-adr-tab/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
└── quickstart.md
```

### Source Code (repository root)
```text
server.js                 # GET /api/adr (adrinfo.kr HTML 프록시)
public/
├── index.html             # tab_adr 마크업
├── app.js                 # extractArrayFromHtml, drawLineChart, 듀얼 동기화 로직
└── style.css
```

**Structure Decision**: 기존 단일 프로젝트 구조 유지. 별도 차트 모듈 분리 없이 `app.js` 내 기존 함수 확장.

## Complexity Tracking
해당 없음.