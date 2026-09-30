# Data Model: Rank 탭

## TransactionRankEntry (거래대금 순위 항목)
| 필드 | 설명 | 비고 |
|---|---|---|
| rank | 순위(정수) | |
| stk_cd | 종목코드 | 원본 `_AL` 접미사 제거 후 사용 |
| stk_nm | 종목명 | KODEX/TIGER 시작 종목 제외 |
| mkt_type | 시장 구분(K/Q) | ka10100 조회로 보강 |
| fluc_rt | 등락률(%) | 원본 flu_rt |
| trde_amt | 거래대금(백만원) | 원본 trde_prica |
| concentration_rate | 쏠림율(%) | 종목 거래대금 ÷ 시장 전체 거래대금 |

## WatchRankEntry (실시간 조회 순위 항목)
| 필드 | 설명 |
|---|---|
| bigd_rank | 순위 |
| stk_cd | 종목코드 |
| stk_nm | 종목명 |
| mkt_type | 시장 구분(K/Q) |
| base_comp_chgr | 등락률 |
| trde_amt | 누적 거래대금(백만원, ka10007 보강) |

## LendableStockEntry (대주가능 종목)
| 필드 | 설명 |
|---|---|
| prdt_name | 종목명 |
| mkt_type | 시장 구분(Kiwoom ka10100으로 판별, 실패 시 "-") |
| prdy_ctrt | 등락률 |
| trad_psbl_qty2 | 매매가능수량 |
| 매매가능금액 | 현재가 × 매매가능수량 (계산값) |

## WatchlistGroup (관심종목 그룹)
| 필드 | 설명 |
|---|---|
| grp_id | 그룹 ID (기본값 `074`) |
| entries[] | 그룹 내 종목 목록(순위, 시장, 종목명, 등락률, 거래대금) |

## 관계 및 상태
- 4개 엔티티 모두 조회 시점의 스냅샷이며 영속 저장되지 않는다(설정 저장 대상 아님 — `006-settings-sync`와는 무관).
- `mkt_type` 판별은 4개 엔티티가 공통으로 서버 메모리의 종목코드별 시장 캐시를 공유한다.