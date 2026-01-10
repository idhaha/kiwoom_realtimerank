# WireGuard Windows 설정 (수정)

## 중요: Windows 서비스 등록

WireGuard를 런처에서 제어하려면 **한 번만** 다음 작업이 필요합니다:

### 1단계: WireGuard 앱에서 터널 가져오기

1. WireGuard 앱 실행
2. 왼쪽 하단 **"Add Tunnel"** → **"Add empty tunnel..."** 클릭
3. 또는 **"Import tunnel(s) from file"** 클릭
4. `proton.conf` 파일 선택
5. 터널 이름이 **"proton"** 인지 확인

### 2단계: 관리자 권한으로 서비스 설치

**명령 프롬프트 (관리자 권한)** 실행:

```cmd
cd "C:\Program Files\WireGuard"
wireguard.exe /installtunnelservice "C:\Program Files\WireGuard\Data\Configurations\proton.conf"
```

### 3단계: 서비스 확인

**PowerShell (관리자)** 에서:

```powershell
Get-Service -Name "WireGuardTunnel$proton"
```

서비스가 보이면 성공!

## 간단한 대안: 수동 제어

서비스 등록이 복잡하면:

### 방법 1: WireGuard 앱 자동 열기

런처 버튼으로 **WireGuard 앱만 실행**:
- 사용자가 앱에서 수동으로 "Activate" 클릭

### 방법 2: 완전 수동
1. WireGuard 앱 미리 열어두기
2. "proton" 터널 Activate
3. 런처에서 서버/터널만 제어

## 추천 방식

**가장 간단한 방법:**

런처의 "3. VPN 연결" 버튼을:
- **WireGuard 앱 실행 버튼**으로 변경
- 사용자가 앱에서 직접 Activate

**장점:**
- 권한 문제 없음
- 설치 불필요
- 확실한 작동

이 방식으로 변경할까요?
