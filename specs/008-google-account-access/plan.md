# Implementation Plan: Google 계정 접근 제어 및 프로필

**Branch**: `008-google-account-access` | **Date**: 2026-10-03 | **Spec**: specs/008-google-account-access/spec.md

## Summary

Google Identity Services가 사용자 로그인을 처리하고, Express 서버는 Google ID 토큰을 검증한 뒤 허용 이메일에 한해 HttpOnly 세션 쿠키를 발급한다. `/api` 인증 미들웨어가 로그인, 세션 확인, 로그아웃 외의 API 요청을 보호한다. 고정 관리자인 `azikanbal@gmail.com`만 허용 이메일 목록을 관리하며, 프로필 모달에서 이메일 관리와 로그아웃을 제공한다.

## Technical Context

**Language/Version**: Node.js >= 18, 브라우저 vanilla JavaScript/CSS

**Primary Dependencies**: 기존 Express와 Axios, Google Identity Services; 신규 패키지 없음

**Storage**: `authorized_emails.json`은 서버 프로젝트 루트의 Git 제외 파일, 세션은 프로세스 메모리 Map

**Testing**: 자동화 테스트 없음. `quickstart.md`의 수동 시나리오를 사용한다.

**Target Platform**: Oracle Cloud + PM2 및 로컬 개발 서버, 최신 브라우저

## Constitution Check

- **I. Spec-First**: PASS — 현재 구현을 확인한 brownfield 요구사항과 실제 라우트 계약을 문서화한다.
- **II. External API Resilience**: PASS — Google 토큰 검증 실패는 로그인만 거부하고 명확한 오류를 반환한다.
- **III. Secrets Isolation**: PASS — 허용 목록과 임시 파일은 `.gitignore`에서 제외한다. Google client ID는 비밀 자격 증명이 아닌 OAuth audience 식별자다.
- **IV. Solo-Maintainer Simplicity**: PASS — 기존 Express/Axios와 단일 프로세스 메모리 세션을 사용한다.
- **V. Agent-Agnostic Workflow**: PASS — 설계 및 계약은 일반 Markdown으로 관리한다.

## Project Structure

```text
specs/008-google-account-access/
├── spec.md
├── plan.md
├── tasks.md
├── quickstart.md
└── contracts/api.md
server.js       # 토큰 검증, 세션 및 API 접근 제어, 관리자 목록 API
public/index.html # Google 로그인 UI와 프로필 모달
public/app.js   # 로그인 요청, 세션 부팅 확인, 프로필 관리 UI
public/style.css # 프로필 아이콘 및 모달 스타일
.gitignore      # 허용 목록 파일 제외
```

## Design Decisions

- 클라이언트가 제출한 이메일이나 JWT payload를 신뢰하지 않고, Google에 ID token을 검증받은 서버 응답의 이메일만 사용한다.
- 인증 미들웨어는 Express의 모든 API 핸들러보다 먼저 등록한다. 로그인·세션 확인·로그아웃 세 경로만 통과시킨다.
- 관리 권한은 브라우저 UI 표시만으로 부여하지 않고 매 관리자 API 요청에서 서버가 확인한다.
- 세션은 HttpOnly 쿠키에 opaque random ID만 담고 실제 세션 정보는 서버 메모리에 둔다.
- 프로젝트 설정은 기존 단일 공용 파일을 유지하므로 허용된 여러 계정 사이에서 데이터 격리는 제공하지 않는다.
