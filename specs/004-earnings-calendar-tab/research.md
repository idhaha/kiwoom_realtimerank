# Research: 증시캘린더 탭

## Decision: 같은 출처 iframe + 서버 사이드 프록시
- **Rationale**: 토스증권 페이지를 직접 iframe으로 열면 X-Frame-Options/CSP로 차단될 가능성이 높아, 서버가 HTML을 가져와 같은 출처(자사 도메인)로 재서빙하는 방식이 필요.
- **Alternatives considered**: 공식 임베드 위젯 사용 — 토스증권이 서드파티 임베드 위젯을 공식 제공하지 않아 기각.

## Decision: 허용 호스트 화이트리스트(tossinvest.com, toss.im)
- **Rationale**: 프록시가 임의 사이트를 중계하는 오픈 프록시가 되는 것을 방지하기 위한 최소한의 보안 조치.
- **Alternatives considered**: 화이트리스트 없이 전체 허용 — 보안 위험이 커서 기각.

## Decision: 월별 데이터는 표시 월 기준 전후 3개월(총 7개월) 선반입 로드
- **Rationale**: 월 전환 시 대기시간을 줄이기 위한 사전 로드 전략으로, 기존 구현에서 이미 검증됨.
- **Alternatives considered**: 매 월 전환마다 단건 요청 — 반응성이 떨어져 기각.