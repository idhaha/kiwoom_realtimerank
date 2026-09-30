# API Contracts: ADR 탭

## GET /api/adr
**Response 200**: 원본 HTML 문자열(adrinfo.kr/chart 응답 그대로, `res.send`)
**타임아웃**: 8000ms
**실패 시**: 프록시 요청 실패 → 클라이언트가 기존 렌더링 유지 + "업데이트 실패" 상태 표시(HTTP 상태 코드는 axios 오류를 그대로 전파하거나 500).

> 이 엔드포인트는 원본 사이트의 원시 HTML을 그대로 전달하는 프록시이며, 구조화된 JSON 계약이 아니다. 실제 데이터 파싱(`extractArrayFromHtml`)은 클라이언트에서 수행된다.