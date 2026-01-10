# WireGuard 반자동 사용 가이드

## 설정 (한 번만)

### 1. WireGuard 설치
- https://www.wireguard.com/install/
- Windows Installer 다운로드 및 설치

### 2. Proton VPN 설정 파일 가져오기

**방법 1: 웹에서 다운로드**
1. https://account.protonvpn.com/downloads 로그인
2. "WireGuard configuration" 섹션
3. 이름: `proton`, 플랫폼: Windows
4. Download → `proton.conf` 받기

**방법 2: 앱에서 가져오기**
1. WireGuard 앱 실행
2. "Add Tunnel" → "Import tunnel(s) from file"
3. `proton.conf` 파일 선택

### 3. 확인
WireGuard 앱 왼쪽에 **"proton"** 터널이 보이면 성공!

---

## 사용 방법 (매번)

### KT WiFi에서 사용할 때

```
① 런처: "1. 서버 시작" 클릭
② 런처: "3. WireGuard 앱" 클릭
   → WireGuard 앱 자동 실행됨
③ WireGuard 앱: "proton" 옆의 "Activate" 클릭
④ 런처: "2. 터널 연결" 클릭
⑤ 외부 URL로 접속
```

### 종료할 때

```
① 런처: "2. 터널 해제"
② WireGuard 앱: "Deactivate" 클릭
③ 런처: "1. 서버 중지"
④ WireGuard 앱 닫기
```

---

## 장점

✅ **간단함** - 복잡한 서비스 설정 불필요
✅ **확실함** - 앱에서 직접 제어, 오류 없음
✅ **빠름** - 버튼 클릭으로 앱 바로 실행
✅ **안전함** - 권한 문제 없음

---

## 팁

### WireGuard 앱을 미리 열어두면?
런처의 "3. WireGuard 앱" 버튼을 건너뛰고:
1. WireGuard 앱 미리 실행
2. "proton" Activate
3. 런처에서 서버/터널만 시작

### yglee24 WiFi에서는?
VPN 없이도 작동하므로:
- "3. WireGuard 앱" 건너뛰기
- 바로 서버 → 터널 시작

### 자동화하고 싶다면?
Windows 시작 시 WireGuard 자동 실행:
1. WireGuard 앱 → Settings
2. "Launch on startup" 체크
3. PC 재시작 시 자동 실행

---

## 요약

**반자동 = 런처 버튼으로 앱 열기 + 앱에서 수동 Activate**

이 방식이 Windows에서 가장 안정적이고 간단합니다!
