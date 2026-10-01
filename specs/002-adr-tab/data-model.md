# Data Model: ADR 탭

## AdrDataPoint
| 필드 | 설명 |
|---|---|
| date | 타임스탬프(원천 배열의 첫 번째 값). 값이 null인 항목은 제외 |
| value | ADR 수치(%) |

## AdrSeries
| 필드 | 설명 |
|---|---|
| market | "kospi" 또는 "kosdaq" |
| points[] | AdrDataPoint 배열(날짜 오름차순) |

> 메모리 캐시(`tabData['tab_adr'].adr`)에는 `{ kospi: AdrDataPoint[], kosdaq: AdrDataPoint[], updated: 갱신 시각(ms) }` 형태로 저장된다.

## ChartViewState (프론트엔드 전용, 비영속)
| 필드 | 설명 |
|---|---|
| visibleCount | 현재 표시 거래일 수(기간 선택기 값) |
| scrollOffset | 표시 구간의 시작 인덱스(소수 가능) |
| hoveredIndex | 현재 표시 구간 안에서의 상대 인덱스(0부터). 전체 데이터 인덱스가 아님 |
| visibleStartDate | 표시 구간 첫 날짜(차트 간 동기화 기준) |
| visibleEndDate | 표시 구간 마지막 날짜 |
| hoveredDate | 호버 중인 날짜(차트 간 호버 동기화 기준, 날짜 기준 nearest-index 매핑) |