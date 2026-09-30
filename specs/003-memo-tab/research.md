# Research: 메모 탭

## Decision: 수동 저장(자동 저장 미사용)
- **Rationale**: 여러 PC에서 동시 편집 시 자동 저장이 레이스 컨디션과 타이핑 렉을 유발함. 명시적 저장 버튼이 사양서(1.3.4)에 이미 정책으로 명시되어 있다.
- **Alternatives considered**: Debounce 기반 자동 저장 — 다중 PC 동기화 정책(3.4절, 최종 저장 우선)과 결합 시 데이터 손실 위험이 커서 기각.

## Decision: 이중 포맷 저장(HTML + Delta)
- **Rationale**: HTML은 호환성/표시용, Delta는 무손실 서식 복원용으로 상호 보완.
- **Alternatives considered**: Delta만 저장 — 검색엔진/직접 HTML 활용 등 호환성이 떨어져 기각.

## Decision: Google OAuth Implicit Flow(클라이언트 전용, 서버 경유 없음)
- **Rationale**: 서버에 refresh token을 저장/관리할 필요가 없어 Constitution 원칙 III(Secrets Isolation)과 IV(Simplicity)에 부합.
- **Alternatives considered**: 서버 사이드 OAuth(Authorization Code Flow) — refresh token 저장·갱신 로직이 추가로 필요해 1인 개발 규모에는 과함.