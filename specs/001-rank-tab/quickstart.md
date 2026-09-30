# Quickstart: Rank 탭 검증

## 사전 준비
1. `.env`에 `KIWOOM_APPKEY`, `KIWOOM_SECRETKEY` 설정(필수). `EFRIEND_APPKEY`, `EFRIEND_SECRETKEY`, `EFRIEND_DOMAIN`은 선택(없으면 패널 3만 빈 목록).
2. 의존성 설치: `npm ci`
3. 서버 실행: `npm run dev` (또는 `node server.js`)

## 검증 시나리오

1. **초기 로드**: 브라우저에서 `http://localhost:3000` 접속 → Rank 탭이 기본 활성 탭으로 표시되고, 4개 패널에 데이터가 5초 이내 채워지는지 확인 (SC-001).
2. **수동 새로고침**: `#manualRefresh` 클릭 → 4개 패널이 동시에 갱신 시도하는지 확인.
3. **자동 갱신**: `#refreshInterval`을 30초로 변경 → 약 30~35초 후 `#lastUpdate` 시각이 갱신되는지 확인 (SC-002).
4. **eFriend 키 없을 때**: `.env`에서 `EFRIEND_*`를 주석 처리하고 재시작 → 패널 3이 빈 상태로 표시되고 서버가 크래시하지 않는지 확인.
5. **관심종목 그룹 전환**: `#watchlistGroupSelect`에서 다른 그룹 선택 → 패널 4가 하락률 순으로 재정렬되고, 새로고침 후에도 선택이 유지되는지 확인.
6. **장 외 시간 확인**: 장 마감 후 접속 → 전일 마감 데이터가 오류 없이 표시되는지 확인.

## 기대 결과
모든 시나리오가 spec.md의 Acceptance Scenarios 및 Success Criteria(SC-001~004)를 충족해야 한다.