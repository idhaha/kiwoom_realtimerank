# Data Model: 동적 탭

## DynamicTab
| 필드 | 설명 |
|---|---|
| id | `tabs[]`에 저장되는 생성 시각 기반 ID |
| name | `tabs[]`에 저장되는 탭 이름(표시용, ID와 별개) |
| type | 차트 그리드는 `tab_grid_*` ID에서 유추하며 기존 저장값은 셀 배열이다. 사용자 정의 탭은 `overseas_custom` 또는 `exchange_rate` 객체로 저장된다. |
| config | 차트 그리드는 `contents[id]` 자체가 GridCell 배열이다. 사용자 정의 탭은 객체의 `config` 문자열에 입력 문법을 저장한다. |

## GridCell (type=chart_grid일 때 config 내부)
| 필드 | 설명 |
|---|---|
| symbol | 심볼 또는 URL |
| mode | `main`(TradingView/AlphaSquare URL) \| `sub`(Investing.com iframe) |
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

## 저장 호환성

- `tab_grid_*` ID를 가진 과거 스냅샷은 `contents[id]`에 셀 객체 배열을 직접 저장한다. 앱은 이 구조를 계속 읽고 쓴다.
- 사용자 정의 탭은 `{ type, config, sectorColors }` 형태로 저장한다. `exchange_rate` 유형은 별도 생성 메뉴와 TXT 가져오기로 만들 수 있다.
- 탭 이름과 순서는 전체 스냅샷의 `tabs[]` 항목이 관리한다.
