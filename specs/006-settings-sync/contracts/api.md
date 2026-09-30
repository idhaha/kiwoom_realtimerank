# API Contracts: 설정 저장 및 동기화

## GET /api/settings
**Query**: `_t=<timestamp>` (캐시 방지)
**Response 200 (설정 있음)**: `{ "success": true, "data": <AppSettingsSnapshot> }`
**Response 200 (설정 없음)**: `{ "success": true, "data": null }`
**Response 500**: 파일 읽기/JSON 파싱 실패 시

## POST /api/settings
**Request body**: `<AppSettingsSnapshot>` 전체 (Express JSON 본문 한도 50MB)
**Response 200**: `{ "success": true }`
**Response 500**: 파일 쓰기 실패 시
**참고**: 부분 업데이트나 `updatedAt` 비교 없이 항상 전체 덮어쓰기.