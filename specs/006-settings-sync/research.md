# Research: 설정 저장 및 동기화

## Decision: 전체 스냅샷 저장(부분 업데이트/병합 없음)
- **Rationale**: 1인 사용자, 순차 접속 환경에서는 필드 단위 병합이 주는 이득보다 구현 복잡도가 훨씬 크다(YAGNI).
- **Alternatives considered**: 필드별 diff/병합, 버전 벡터 기반 충돌 해결 — 다중 사용자 동시 편집이 실제로 발생할 때 재검토할 과제로 분리하고 현재는 기각.

## Decision: 로컬 우선 기록 후 서버 전송
- **Rationale**: 서버 통신 실패 시에도 사용자가 방금 만든 변경사항을 잃지 않도록 하기 위함.
- **Alternatives considered**: 서버 확인 후 로컬 반영(서버 우선) — 네트워크 지연에 민감해지고, 오프라인 작업이 불가능해져 기각.

## Decision: 서버 파일 단일 소유(사용자 계정 격리 없음)
- **Rationale**: 현재 1인 운영 서비스이므로 계정 시스템 자체가 없다. Constitution 원칙 IV(Simplicity)에 부합.
- **Alternatives considered**: 사용자별 설정 파일 분리 — 다중 사용자 지원이 실제 요구사항이 될 때 도입할 확장 과제로 분리.