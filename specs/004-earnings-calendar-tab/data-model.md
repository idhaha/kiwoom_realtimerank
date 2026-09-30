# Data Model: 증시캘린더 탭

## CalendarEvent (토스 원본, 이 앱은 저장하지 않고 통과만 시킴)
| 필드 | 설명 |
|---|---|
| date | 날짜 |
| title | 일정명 |
| actual / forecast / previous | 발표치/예측치/이전치(경제지표) |
| type | 경제지표 | 실적 구분 |
| region | 국내 | 해외 구분 |

## WeeklyAiSummary
| 필드 | 설명 |
|---|---|
| title | 요약 제목 |
| content | 요약 내용 |

> 이 기능은 데이터를 서버에 저장하지 않는 순수 프록시이므로, 위 엔티티는 원본 응답 구조를 그대로 통과시키는 참고용 스키마다.