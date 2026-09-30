# API Contracts: 메모 탭

## POST /api/settings (메모 저장 시 사용, 006-settings-sync와 공유)
**Request body 예시**:
```json
{ "memoHtml": "<p>...</p>", "memoDelta": { "ops": [ /* ... */ ] }, "...": "기타 전체 스냅샷 필드" }
```
**Response 200**: `{ "success": true }`

## GET /api/settings (메모 새로고침 시 사용)
**Response 200**: `{ "success": true, "data": { "memoHtml": "...", "memoDelta": { ... }, "...": "..." } }`

## Google Calendar API (외부, 브라우저 직접 호출)
- `GET https://www.googleapis.com/calendar/v3/calendars/primary/events`
- `POST/PUT/DELETE .../calendars/primary/events/{eventId}`
- `GET .../calendars/ko.south_korea%23holiday@group.v.calendar.google.com/events`
- 인증: `Authorization: Bearer <google_access_token>` (GIS로 발급)