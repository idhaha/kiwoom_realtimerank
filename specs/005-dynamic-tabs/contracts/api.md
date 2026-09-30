# API Contracts: 동적 탭

## GET /api/finviz-image?url=...
**Response 200**: 이미지 바이너리(프록시 패스스루)

## GET /api/trading-economics?url=...
**Response 200**: `{ "series": [ { "date": "...", "value": 0 } ] }` (TradingEconomics 파싱 결과)

## FRED/ECOS 프록시 (경로는 server.js 기준)
**Response 200**: `{ "series": [ { "date": "...", "value": 0 } ] }` 형태로 정규화된 시계열

> 실패 시 개별 항목만 콘솔 오류로 기록되며, 나머지 항목 로딩은 계속된다(FR-007).