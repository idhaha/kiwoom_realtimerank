# Cloudflare Tunnel 설치 및 설정

## Cloudflare Tunnel이란?
- ngrok의 대안 터널링 서비스
- Cloudflare의 글로벌 네트워크 사용
- 무료로 사용 가능

## 다운로드
1. https://github.com/cloudflare/cloudflared/releases
2. `cloudflared-windows-amd64.exe` 다운로드
3. `cloudflared.exe`로 이름 변경
4. `d:\Program\Kiwoom` 폴더에 복사

## 사용법

### 런처에서 사용
1. 런처 실행
2. "1. 서버 시작" 클릭
3. "2. 터널 연결" 클릭 (Cloudflare Tunnel 자동 시작)
4. 표시되는 URL로 외부 접속

### 수동 실행
```cmd
cloudflared tunnel --url http://localhost:3000
```

## 장점
- ngrok보다 차단될 확률 낮음
- 계정/로그인 불필요
- 무료 무제한

## 주의사항
- URL은 매번 랜덤 생성됨
- 고정 URL이 필요하면 Cloudflare 계정 필요
