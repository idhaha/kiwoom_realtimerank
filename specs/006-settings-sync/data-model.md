# Data Model: 설정 저장 및 동기화

## AppSettingsSnapshot
| 필드 | 설명 |
|---|---|
| activeTabId | 현재 활성 탭 ID |
| tabs[] | `{id, name}` 목록, 표시 순서 |
| contents | 탭 ID별 설정/상태 객체 |
| rankInterval / adrInterval | 갱신 주기 선택값 |
| watchlistGroupId | 관심종목 그룹 |
| memoHtml / memoDelta | 메모 내용(003-memo-tab과 공유 필드) |
| memoUpdatedAt | 마지막 서버 메모 저장 시각. 일반 설정 저장은 기존 값을 보존한다. |
| updatedAt | 직렬화 시점 타임스탬프(충돌 해결에는 미사용) |

## LocalStorageKeys (스냅샷과 별개로 관리)
| 키 | 설명 |
|---|---|
| MultiChart_State_v1 | AppSettingsSnapshot의 로컬 사본 |
| memoContent_html / memoContent_delta | 메모 로컬 폴백 |
| memoContent_updatedAt | 서버에서 적용/저장된 메모 시각 |
| memoPendingServerSyncV1 | 서버 저장 실패 후 재접속에도 보존할 메모와 시각 |
| watchlist_selected_group | 관심종목 그룹 선택 복원용 |
| user_session | 세션 토큰(스냅샷에 포함 안 됨) |

## ServerSettingsFile (user_settings.json)
- AppSettingsSnapshot 전체를 JSON으로 저장하는 서버 측 단일 파일.
- 메모 변경 전 이전의 비어 있지 않은 메모는 `user_settings.memo-backup.json`에 별도 저장한다.
