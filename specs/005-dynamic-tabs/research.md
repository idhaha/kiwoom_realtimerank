# Research: 동적 탭

## Decision: 정규식 기반 휴리스틱 문법 파서 유지
- **Rationale**: 사용자 정의 문법(구획/URL/레이블/기간)은 개인용 도구로서 충분히 동작하며, 정식 파서(렉서+파서) 도입은 1인 개발 규모에 과도한 복잡성 추가.
- **Alternatives considered**: PEG.js 등 파서 생성기 도입 — 현재 문법의 모호성 문제(쌍/삼중항 판별)를 근본적으로 해결하지만, Constitution 원칙 IV에 따라 이번 범위에서는 기각하고 향후 과제로 분리.

## Decision: TradingView/Investing.com은 외부 iframe으로 그대로 임베드
- **Rationale**: 자체 차트 렌더링을 구현하는 대신 검증된 외부 위젯을 사용하는 것이 가장 단순하고 유지보수 부담이 적음.
- **Alternatives considered**: 자체 캔들차트 렌더링 — 대규모 개발 비용 대비 이득이 낮아 기각.

## Decision: 개별 데이터 소스 실패를 항목 단위로 격리
- **Rationale**: Finviz 이미지 하나가 실패해도 탭 전체가 깨지지 않도록 하기 위한 기존 설계를 그대로 유지.
- **Alternatives considered**: 전체 탭 단위 재시도/롤백 — 구현 복잡도 대비 이득이 낮아 기각.