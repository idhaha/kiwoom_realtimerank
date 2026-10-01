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
**참고**: 요청은 전체 스냅샷이지만, 서버는 기존의 `memoHtml`, `memoDelta`, `memoUpdatedAt`을 보존한다. 메모는 전용 경로에서만 명시 저장한다. 파일은 임시 파일 작성 후 원자적으로 교체한다.

## POST /api/settings/memo
**Request body**: `{ "memoHtml": string, "memoDelta": object|null, "memoUpdatedAt": number, "initialSettings": <AppSettingsSnapshot> }`
**Response 200**: `{ "success": true }`
**동작**: 메모 필드를 저장하고 나머지 서버 설정을 보존한다. 이전 메모가 비어 있지 않고 내용이 변경되면 `user_settings.memo-backup.json`에 직전 메모를 보관한다. 실패한 브라우저 저장은 클라이언트의 로컬 미동기화 복사본으로 보존한다.

## POST /api/settings/backups
**Request body**: `{ "txt": string, "json": string }`
**Response 200**: `{ "success": true, "files": [<TXT filename>, <JSON filename>] }`
**Response 400**: 누락된 내용 또는 올바른 AppSettingsSnapshot이 아닌 JSON
**Response 500**: 프로젝트 루트 백업 파일 쓰기 실패
**동작**: 서버가 파일명을 생성하고 두 파일을 프로젝트 루트(`__dirname`)에 저장한다. 같은 시각에 생성된 이름이 이미 있으면 덮어쓰지 않는다.

## GET /api/settings/backups
**Response 200**: `{ "success": true, "files": [{ "filename": string, "bytes": number, "updatedAt": number }] }`
**동작**: 허용된 백업 파일명 패턴과 일치하는 프로젝트 루트 파일만 최신순으로 반환한다.

## GET /api/settings/backups/:filename
**Response 200**: `{ "success": true, "filename": string, "content": string }`
**Response 404**: 허용된 이름 형식이 아니거나 파일이 없음
**동작**: TXT/JSON 백업 파일을 읽기 전용으로 반환한다. 경로 구성 요소는 허용하지 않는다.
