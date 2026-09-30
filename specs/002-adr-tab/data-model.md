# Data Model: ADR 탭

## AdrDataPoint
| 필드 | 설명 |
|---|---|
| date | 타임스탬프(날짜) |
| value | ADR 수치(%) |

## AdrSeries
| 필드 | 설명 |
|---|---|
| market | "kospi" 또는 "kosdaq" |
| points[] | AdrDataPoint 배열(날짜 오름차순) |

## ChartViewState (프론트엔드 전용, 비영속)
| 필드 | 설명 |
|---|---|
| visibleCount | 현재 표시 거래일 수(기간 선택기 값) |
| scrollOffset | 스크롤 위치 |
| hoveredIndex | 호버 중인 데이터 인덱스(동기화 대상) |