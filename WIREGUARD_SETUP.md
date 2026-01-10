# WireGuard + Proton VPN 설정 가이드

## 1단계: WireGuard 설치

### 다운로드
1. https://www.wireguard.com/install/ 접속
2. **Windows Installer** 다운로드
3. 설치 완료

## 2단계: Proton VPN 계정 생성

1. https://protonvpn.com 접속
2. **무료 계정** 가입 (이메일만 필요)
3. 로그인

## 3단계: WireGuard 설정 파일 다운로드

### Proton VPN 웹사이트에서:

1. 로그인 후 **Dashboard** → **Downloads** 이동
2. **WireGuard Configuration** 섹션 찾기
3. 아래 정보 선택:
   - **Platform**: Windows
   - **Protocol**: WireGuard
   - **Free servers** 중 아무거나 선택 (예: Japan Free)
4. **Download** 클릭 → `protonvpn-XX-YY.conf` 파일 다운로드

### 파일 이름 변경 및 이동

1. 다운로드된 `.conf` 파일 이름을 **`proton.conf`** 로 변경
2. 파일을 다음 경로로 이동:
   ```
   C:\Program Files\WireGuard\Data\Configurations\proton.conf
   ```

**중요:** 파일 이름은 반드시 `proton.conf`여야 합니다!

## 4단계: 설정 확인

### WireGuard 앱에서 확인
1. WireGuard 앱 실행
2. 좌측에 **"proton"** 이라는 터널이 보여야 함
3. 수동으로 "Activate" 클릭해서 테스트
4. 작동하면 "Deactivate"

## 5단계: 런처에서 사용

### 사용 순서
```
1. "1. 서버 시작"
2. "3. VPN 연결"  ← WireGuard 자동 실행
3. "2. 터널 연결"
4. 외부 접속
5. 역순으로 종료
```

### 로그 확인
```
[시간] WireGuard VPN을 연결합니다...
[시간] ✓ VPN 연결 완료!
```

## 문제 해결

### "wg-quick를 찾을 수 없음"
- WireGuard를 관리자 권한으로 재설치
- 또는 PATH에 추가:
  ```
  C:\Program Files\WireGuard
  ```

### "VPN 연결 실패"
1. `proton.conf` 파일이 제대로 있는지 확인
2. WireGuard 앱에서 수동으로 테스트
3. Proton VPN 계정이 활성화되어 있는지 확인

### 연결은 되는데 인터넷이 안됨
- Proton VPN 무료 계정: 일부 서버만 사용 가능
- 다른 서버 conf 파일로 시도

## 확인 방법

**VPN 작동 확인:**
1. WireGuard VPN 연결
2. https://www.whatismyip.com 접속
3. IP 주소가 Proton VPN 서버 IP로 표시되면 성공!

## 팁

- **무료 계정**: 3개 국가 서버만 사용 가능
- **속도**: 무료도 충분히 빠름
- **자동 연결**: 런처 버튼 한 번으로 OK
- **Cloudflare Tunnel과 충돌 없음** ✓
