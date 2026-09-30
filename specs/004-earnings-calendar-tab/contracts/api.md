# API Contracts: 증시캘린더 탭

## GET /calendar (및 호환 경로 GET /api/toss_calendar)
**Response 200**: 재작성된 HTML(토스 캘린더 페이지, `<base>` 태그 및 URL 변환 스크립트 삽입)
**타임아웃**: 10초

## POST /api/toss_calendar_proxy
**용도**: 월별 일정(`/api/v4/calendar/monthly/YYYY-MM`) 및 주간 AI 요약(`/api/v1/nova-calendar/ai/summary/weekly`) 프록시
**Response 200**: `{ "result": { /* 토스 원본 응답 */ } }`
**제한**: 허용 호스트 `*.tossinvest.com`, `*.toss.im`만, 타임아웃 15초, 응답 최대 20MB

## 정적/이미지 리소스 프록시
**경로**: `/assets/v2/_next/static/chunks/...` 등
**용도**: 토스 페이지의 JS 번들, 이미지, 서비스워커 청크를 같은 출처로 재서빙