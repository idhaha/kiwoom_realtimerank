# Data Model: 동적 탭

## DynamicTab
| 필드 | 설명 |
|---|---|
| id | 생성 시각 기반 ID |
| name | 탭 이름(표시용, ID와 별개) |
| type | `chart_grid` \| `overseas_custom` \| `exchange_rate` |
| config | 유형별 설정 데이터(아래 참고) |

## GridCell (type=chart_grid일 때 config 내부)
| 필드 | 설명 |
|---|---|
| symbol | 심볼 또는 URL |
| mode | `tradingview` \| `investing` |
| mainSrc | TradingView 임베드 URL |
| subSrc | Investing.com 임베드 URL |

## CustomChartEntry (type=overseas_custom/exchange_rate일 때 config 내부)
| 필드 | 설명 |
|---|---|
| url | 데이터 소스 URL 또는 `fred(...)`/`ecos(...)` 표현식 |
| label | 표시명 |
| period | 기간(선택, 삼중항 문법일 때만) |
| sectionTitle | 소속 구획 제목 |

## Section
| 필드 | 설명 |
|---|---|
| title | 구획 제목 |
| color | 구획 색상(`sectorColors` 매핑) |