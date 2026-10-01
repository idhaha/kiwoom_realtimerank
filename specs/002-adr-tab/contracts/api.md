# API Contracts: ADR 탭

## GET /api/adr
**Response 200**: 원본 HTML 문자열(adrinfo.kr/chart 응답 그대로, `res.send`)
**타임아웃**: 8000ms
**실패 시**: 프록시 요청(axios) 실패 → 서버는 항상 HTTP 500과 JSON `{ "error": "ADR 데이터를 가져오는데 실패했습니다.", "details": <axios 오류 메시지> }`를 반환한다. 클라이언트는 이를 받으면 기존 렌더링을 유지하고 "업데이트 실패" 상태를 표시한다.

**업스트림 요청**: 서버는 `http://adrinfo.kr/chart?t=<서버 시각(ms)>`를 호출한다(캐시 방지용 타임스탬프). 요청에는 일반 브라우저 형태의 `User-Agent` 헤더가 포함된다.

**클라이언트 호출**: `/api/adr?t=<ms>`로 `fetch(..., { cache: 'no-store' })` 호출한다. `t` 쿼리 파라미터는 브라우저 캐시 방지용이며 서버는 사용하지 않는다.

**클라이언트 실패 판정**: HTTP 비정상(`res.ok === false`), 응답 본문 100자 미만, 파싱 결과에서 KOSPI·KOSDAQ 중 한쪽이라도 0건이면 실패로 처리한다.

> 이 엔드포인트는 원본 사이트의 원시 HTML을 그대로 전달하는 프록시이며, 구조화된 JSON 계약이 아니다. 실제 데이터 파싱(`extractArrayFromHtml`)은 클라이언트에서 수행된다.