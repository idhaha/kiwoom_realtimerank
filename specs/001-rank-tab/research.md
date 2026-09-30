# Research: Rank 탭

## Decision: Node.js + Express 유지
- **Rationale**: 이미 프로덕션(Oracle Cloud)에서 안정적으로 운영 중이며, Constitution 원칙 IV(Solo-Maintainer Simplicity)에 따라 새 프레임워크 도입은 정당화되지 않는다.
- **Alternatives considered**: NestJS 등 구조화된 프레임워크 — 1인 개발·소규모 트래픽 환경에 비해 과도한 복잡성으로 기각.

## Decision: 인증 토큰 메모리 캐싱
- **Rationale**: 키움/한투 토큰은 24시간 유효하며 단일 서버 프로세스 내 변수(`cachedToken`, `tokenExpiryTime`)로 캐싱하는 것으로 충분하다.
- **Alternatives considered**: Redis 등 외부 캐시 저장소 — 다중 서버 인스턴스가 없는 현재 규모에서 불필요(YAGNI).

## Decision: 순차 처리 + 100ms 지연으로 Rate Limit 대응
- **Rationale**: 키움 REST API의 초당 요청 제한(약 5회)을 준수하기 위한 가장 단순한 방법이며 이미 코드에 적용되어 있다.
- **Alternatives considered**: Bottleneck 등 전용 rate-limiting 라이브러리 — 현재 호출 패턴(패널당 최대 20개 종목)에서는 과한 의존성 추가로 기각.

## Decision: 시장 구분(KOSPI/KOSDAQ) 캐시를 서버 메모리 Map으로 유지
- **Rationale**: 서버 재시작 시 캐시가 초기화되어도 재구성 비용이 낮아(개별 조회 3초 제한 내) 무리가 없다.
- **Alternatives considered**: 파일 또는 DB 영속화 — 이 정도 규모에서는 불필요한 인프라 추가.

## NEEDS CLARIFICATION 해소 여부
spec.md에 [NEEDS CLARIFICATION] 마커가 없어 추가 조사 항목 없음.