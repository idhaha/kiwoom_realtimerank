# Research: ADR 탭

## Decision: 서버 사이드 HTML 프록시로 CORS 우회
- **Rationale**: adrinfo.kr이 CORS를 허용하지 않아 브라우저 직접 fetch 불가. 가장 단순한 해결책은 Express 프록시.
- **Alternatives considered**: 브라우저 확장 프로그램 우회, 서드파티 CORS 프록시 서비스 — 안정성과 통제권 부족으로 기각.

## Decision: 괄호 균형 스택 파싱 + 정규식 폴백
- **Rationale**: 신뢰할 수 없는 원천 HTML에서 안전하게 배열을 추출하기 위함. 순수 정규식만 쓰면 ReDoS 위험.
- **Alternatives considered**: 전용 HTML 파서(cheerio 등) 도입 — 이 한 곳의 데이터 추출을 위해 새 의존성 추가는 과함(YAGNI).

## Decision: Canvas 2D 직접 렌더링(차트 라이브러리 미사용)
- **Rationale**: 듀얼 차트 커서/줌 동기화 같은 커스텀 인터랙션을 세밀히 제어하기 위해 기존에 직접 구현되어 있으며 안정적으로 동작 중.
- **Alternatives considered**: Chart.js, D3 — 기존 커스텀 동기화 로직을 마이그레이션하는 비용이 이득보다 커서 기각(현재 범위에서는 유지).