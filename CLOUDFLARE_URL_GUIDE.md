# Cloudflare Tunnel 사용 가이드

## URL 생성 과정

### 1. cloudflared 실행
```bash
cloudflared tunnel --url http://localhost:3001
```

### 2. 자동 URL 생성
- cloudflared가 Cloudflare 서버와 연결
- **랜덤 URL 자동 생성**: `https://abc-def-123.trycloudflare.com`
- 매번 실행할 때마다 다른 URL 생성

### 3. 로그 출력 예시
```
2023-12-22T21:20:00Z INF Thank you for trying Cloudflare Tunnel. 
2023-12-22T21:20:01Z INF Your quick Tunnel has been created! Visit it at:
2023-12-22T21:20:01Z INF https://abc-def-123.trycloudflare.com
```

### 4. 런처가 자동으로
- ✅ URL 자동 추출
- ✅ 하이라이트 표시
- ✅ 클립보드에 자동 복사

## 고정 URL 사용하려면?

### Cloudflare 계정 필요
1. https://dash.cloudflare.com 가입
2. Tunnel 생성
3. 고정 도메인 설정
4. 인증 토큰 사용

**하지만 무료 랜덤 URL로도 충분합니다!**

## 사용 흐름

```
[런처]
  ↓ "2. 터널 연결" 클릭
[cloudflared 실행]
  ↓ 자동 URL 생성
[로그에 URL 표시]
  ↓ 
[클립보드에 자동 복사]
  ↓
[외부에서 URL로 접속]
```

## 주의사항

- URL은 **터널이 실행 중일 때만** 유효
- 터널 종료 후 재시작하면 **새로운 URL** 생성
- 고정 URL이 필요하면 Cloudflare 계정 필요 (유료)
