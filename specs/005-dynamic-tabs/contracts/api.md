# API Contracts: 동적 탭

## GET /api/finviz-image?url=...
**Response 200**: 이미지 바이너리(프록시 패스스루)

## GET /api/trading-economics?url=...
**Response 200**: `{ "success": true, "data": [...] }` (TradingEconomics 원본/파싱 결과. 캐시 적중 시에도 같은 envelope)

## FRED/ECOS 프록시 (경로는 server.js 기준)
**FRED `GET /api/fred?series_id=...&period=...`**: `{ "success": true, "data": [{ "date": "...", "value": 0 }] }`

입력 표현식 `fred(DGS10,10y)`는 `series_id=DGS10&period=10y`로 변환된다. 기간을 생략하면 클라이언트가 `1y`를 전달하며, `10년/10y`, `5년/5y`, `2년/2y`, `1년/1y`, `6개월/6m` 별칭을 정규화한다.

응답은 `{ "success": true, "data": [{ "date": "YYYY-MM-DD", "value": number }] }`이다. Express는 series ID와 기간 조합별 캐시를 사용하고, 캐시 미스 시 `python fred_api.py "<seriesId>" "<period>"`을 실행한다. Python 스크립트는 `.env`의 `FRED_APPKEY`로 FRED 관측값을 가져온다.

한 입력 행의 각 FRED 항목은 별도 `/api/fred` 요청을 수행한다. `loadMultiSeriesChart()`가 결과를 하나의 Canvas에 여러 선으로 구성하며 한 요청 실패는 다른 시리즈 요청을 막지 않는다. `https://fred.stlouisfed.org/series/DGS10`은 설명 페이지이므로 현재 입력 파서가 이 URL에서 ID를 추출하지 않는다.

**ECOS `GET /api/ecos?table=...&item=...&start=YYYYMMDD&end=YYYYMMDD`**: `{ "success": true, "data": [/* ECOS row objects, including TIME and DATA_VALUE */] }`

클라이언트는 각 응답의 `data`를 차트 입력용 `{date, value}` 시계열로 변환한다. 이 프록시 응답은 공통 `{series: [...]}` envelope가 아니다.

**오류 응답**: JSON `{ "success": false, "error": "..." }` 또는 HTTP 오류. 외부 데이터 소스 하나의 오류는 해당 항목에서 격리한다.

> 실패 시 개별 항목만 콘솔 오류로 기록되며, 나머지 항목 로딩은 계속된다(FR-007).
