# Implementation Plan: 증시캘린더 다중 소스 탭

**Branch**: `007-multi-source-market-calendar` | **Date**: 2026-10-03 | **Spec**: specs/007-multi-source-market-calendar/spec.md

## Summary

기존 고정 증시캘린더 탭을 세 공급자용 작은 탭으로 확장한다. Toss는 기존 `/calendar` 같은 출처 프록시를 계속 쓰고, SEIBro와 Investing.com은 각 HTTPS URL을 iframe에서 직접 연다. 한 번에 선택한 iframe 하나만 표시·로드하며, 원본 링크와 마지막 선택 상태를 제공한다.

## Technical Context

**Language/Version**: 브라우저 vanilla JavaScript/CSS, Node.js >= 18

**Primary Dependencies**: 기존 앱 의존성만 사용; 신규 패키지 없음

**Storage**: 기존 `tabData` 및 `saveAppData()` 설정 스냅샷에 `activeCalendarId` 보관

**Testing**: 자동화 테스트 없음. `quickstart.md` 수동 검증으로 확인.

**Target Platform**: Oracle Cloud + PM2, 최신 데스크톱 브라우저

**Constraints**: SEIBro/Investing.com의 임베드 정책은 앱에서 바꿀 수 없음. Toss 프록시 보안 허용 목록과 라우트는 변경하지 않는다.

## Constitution Check

- **I. Spec-First**: PASS — 새 동작을 구현과 함께 이 문서에 기록.
- **II. External API Resilience**: PASS — iframe 격리, 공급자별 실패 범위, 새 창 원본 링크 제공.
- **III. Secrets Isolation**: PASS — 공개 HTTPS 페이지만 연결하며 비밀정보 없음.
- **IV. Solo-Maintainer Simplicity**: PASS — 단일 iframe과 기존 설정 저장 경로 재사용, 신규 의존성 없음.
- **V. Agent-Agnostic Workflow**: PASS — 모든 산출물은 일반 Markdown.

## Project Structure

```text
specs/007-multi-source-market-calendar/
├── spec.md
├── plan.md
├── tasks.md
└── quickstart.md
public/
├── app.js       # 공급자 탭 마크업, 전환 및 선택 상태 저장
└── style.css    # 작은 탭 UI 및 포커스 표시
```

## Design Decisions

- 공급자 목록은 기존 `createChartGrid()`의 증시캘린더 분기에서 정적으로 정의한다.
- 활성 공급자는 `tabData.tab_earnings.activeCalendarId`로 저장한다. 잘못되거나 누락된 값은 `toss`로 대체한다.
- provider 변경 때 iframe `src`만 교체하므로 비선택 소스의 요청을 시작하지 않는다.
- cross-origin 오류 감지는 불가능하므로 원본 링크를 항상 노출한다.
