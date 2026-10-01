# API Contracts: Rank 탭

## GET /api/transaction_rank
**Query**: `mrkt_tp` (000|001|101), `stex_tp` (1|2|3, 기본 3)
**Response 200**:
```json
{ "items": [ { "rank": 1, "stk_cd": "005930", "stk_nm": "삼성전자", "mkt_type": "K", "fluc_rt": "+1.23", "trde_amt": 12345, "concentration_rate": 5 } ] }
```
**실패 시**: 키움 키 누락 → HTTP 500. 시장 전체 거래대금 조회 실패 시 `concentration_rate`는 `-`.

## GET /api/stock
**Query**: `qry_tp` (1~5)
**Response 200**:
```json
{ "data": { "rank": [ /* WatchRankEntry[] */ ], "efriend": [ /* LendableStockEntry[] */ ] } }
```
**실패 시**: 한투 키 누락 → `data.efriend`는 빈 배열(`[]`), 서버 오류 없음.

## GET /api/watchlist_groups
**Response 200**: `{ "groups": [ { "grp_id": "074", "grp_nm": "..." } ] }`

## GET /api/watchlist_rank
**Query**: `grp_id`
**Response 200**: `{ "items": [ /* WatchlistGroup.entries[] */ ] }`, 하락률 큰 순 정렬.

## GET /api/watchlist_debug (비공개/디버그 전용)
프론트엔드에서 사용하지 않는 수동 디버그 엔드포인트. 이 계약 문서의 공식 API 범위에서 제외한다.

> 위 응답 스키마는 `docs/SYSTEM_SPECIFICATION.md` 1.1.3절과 `server.js` 구현을 근거로 정리한 것이며, 필드명은 실제 코드의 원본 키(위 data-model.md 참고)를 그대로 따른다.