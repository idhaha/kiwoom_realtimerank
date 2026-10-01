# API Contracts: 동적 탭

## GET /api/finviz-image?url=...
**Response 200**: 이미지 바이너리(프록시 패스스루)

## GET /api/trading-economics?url=...
**Response 200**: `{ "success": true, "data": [...] }` (TradingEconomics 원본/파싱 결과. 캐시 적중 시에도 같은 envelope)

## FRED/ECOS 프록시 (경로는 server.js 기준)
**FRED `GET /api/fred?series_id=...&period=...`**: `{ "success": true, "data": [{ "date": "...", "value": 0 }] }`

**ECOS `GET /api/ecos?table=...&item=...&start=YYYYMMDD&end=YYYYMMDD`**: `{ "success": true, "data": [/* ECOS row objects, including TIME and DATA_VALUE */] }`

클라이언트는 각 응답의 `data`를 차트 입력용 `{date, value}` 시계열로 변환한다. 이 프록시 응답은 공통 `{series: [...]}` envelope가 아니다.

**오류 응답**: JSON `{ "success": false, "error": "..." }` 또는 HTTP 오류. 외부 데이터 소스 하나의 오류는 해당 항목에서 격리한다.

> 실패 시 개별 항목만 콘솔 오류로 기록되며, 나머지 항목 로딩은 계속된다(FR-007).
