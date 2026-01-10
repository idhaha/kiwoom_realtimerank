# VPN 통합 가이드

## Cloudflare WARP 설치

### 1. WARP 다운로드 및 설치
1. https://1.1.1.1 접속
2. Windows용 다운로드
3. 설치 완료

### 2. warp-cli 설정
설치 후 자동으로 `warp-cli` 명령어 사용 가능

**확인 방법:**
```cmd
warp-cli --version
```

## 런처에서 VPN 사용

### 사용 흐름
```
1. "3. VPN 연결" 클릭
   ↓
2. warp-cli connect 실행
   ↓
3. VPN 상태 표시등 초록색
   ↓
4. "2. 터널 연결" 클릭 (ngrok/Cloudflare)
   ↓
5. 외부 접속 가능
   ↓
6. 사용 완료 후 "3. VPN 해제" 클릭
```

### 주의사항

**VPN 먼저, 터널 나중에:**
1. VPN 연결
2. 터널 연결
3. 외부 접속
4. 터널 해제
5. VPN 해제

**왜?**
- VPN 없이 터널만 연결하면 KT WiFi가 차단
- VPN으로 트래픽 암호화 → KT가 터널 감지 불가

## 자동화된 기능

런처가 자동으로:
- ✅ warp-cli 실행
- ✅ 연결 상태 감지
- ✅ 상태 표시
- ✅ 연결/해제 알림

## 수동 제어 (참고용)

```cmd
# VPN 연결
warp-cli connect

# VPN 상태 확인
warp-cli status

# VPN 해제
warp-cli disconnect
```

## 문제 해결

### warp-cli를 찾을 수 없음
- WARP 앱이 설치되어 있는지 확인
- PATH 환경변수에 추가 필요할 수 있음

### VPN 연결이 안됨
- WARP 앱 먼저 실행
- 앱에서 계정 등록
- 런처에서 다시 시도
