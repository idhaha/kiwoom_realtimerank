# 키움증권 실시간종목조회순위 웹서비스

Vercel을 활용한 키움증권 실시간종목조회순위 데이터 표시 웹 애플리케이션입니다.

## 📋 기능

- ✅ 키움증권 REST API를 통한 실시간종목조회순위 데이터 조회
- ✅ 자동 새로고침 (30초 간격)
- ✅ 현대적이고 아름다운 다크모드 UI
- ✅ 반응형 디자인 (모바일/태블릿/데스크톱)
- ✅ Vercel Serverless Functions로 안전한 API 키 관리
- ✅ Vercel로 빠른 배포 및 자동 HTTPS

## 🏗️ 프로젝트 구조

```
d:\Program\Kiwoom\
├── api/                    # Vercel Serverless Functions
│   └── stock.js           # 키움 API 호출 로직
├── public/                # 정적 파일 (프론트엔드)
│   ├── index.html         # 메인 HTML
│   ├── style.css          # 스타일시트
│   └── app.js             # 클라이언트 JavaScript
├── package.json           # 프로젝트 의존성
├── vercel.json            # Vercel 설정
└── .gitignore             # Git 제외 파일
```

## 🚀 Vercel 배포 가이드

### 1. GitHub Repository 준비

이미 완료! ✅
- Repository: https://github.com/idhaha/kiwoom_realtimerank

### 2. Vercel에 프로젝트 Import

1. **Vercel 로그인**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **새 프로젝트 생성**
   - Dashboard에서 "Add New..." → "Project" 클릭
   - GitHub repository 연동 (처음이라면 Vercel에 GitHub 접근 권한 부여)

3. **Repository 선택**
   - `idhaha/kiwoom_realtimerank` 선택
   - "Import" 클릭

4. **프로젝트 설정**
   - **Project Name**: `kiwoom-realtimerank` (또는 원하는 이름)
   - **Framework Preset**: Other (자동 감지됨)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: 비워두기 (필요 없음)
   - **Output Directory**: `public` (자동 설정됨)

### 3. 환경변수 설정 ⚠️ 중요!

배포 전에 반드시 환경변수를 설정해야 합니다:

1. **Environment Variables 섹션으로 이동**
2. **다음 환경변수 추가**:

   | Name | Value |
   |------|-------|
   | `KIWOOM_APPKEY` | 발급받은 APP KEY |
   | `KIWOOM_SECRETKEY` | 발급받은 SECRET KEY |

3. **Environment**: `Production`, `Preview`, `Development` 모두 선택

### 4. 배포

1. **Deploy 버튼 클릭**
2. 배포 진행 상황 확인 (약 1-2분 소요)
3. 배포 완료 후 URL 확인 (예: `https://kiwoom-realtimerank.vercel.app`)

### 5. 배포 확인

1. 제공된 URL 접속
2. 실시간종목조회순위 데이터가 표시되는지 확인
3. 새로고침 버튼 작동 확인
4. 자동 새로고침 기능 확인 (30초 대기)

## 🔄 업데이트 배포

코드를 수정한 후:

```bash
git add .
git commit -m "업데이트 내용"
git push
```

→ Vercel이 자동으로 감지하고 재배포합니다! 🎉

## 🔑 키움 API 정보

- **API ID**: ka00198
- **API 명**: 실시간종목조회순위
- **URL**: /api/dostk/stkinfo
- **도메인**: https://api.kiwoom.com

## 💡 사용 방법

1. 웹사이트에 접속하면 자동으로 데이터가 로드됩니다
2. 자동 새로고침이 기본으로 활성화되어 있습니다 (30초 간격)
3. 수동으로 새로고침하려면 "새로고침" 버튼을 클릭하세요
4. 자동 새로고침을 끄려면 토글 스위치를 클릭하세요

## 🎨 UI 특징

- 다크모드 기반 프리미엄 디자인
- 그라디언트 및 glassmorphism 효과
- 부드러운 애니메이션 및 호버 효과
- 반응형 레이아웃

## 📊 Vercel 무료 플랜 한도

이 프로젝트는 Vercel 무료 플랜(Hobby Plan)으로 충분히 운영 가능합니다:

- **Serverless Functions 실행 시간**: 월 100 GB-시간
- **대역폭**: 월 100GB
- **빌드 시간**: 월 100시간
- **자동 HTTPS**: 무료
- **커스텀 도메인**: 무료

## 🔧 문제 해결

### 환경변수 오류
```
API 키가 설정되지 않았습니다
```
→ Vercel Dashboard → 프로젝트 → Settings → Environment Variables에서 `KIWOOM_APPKEY`와 `KIWOOM_SECRETKEY`를 설정했는지 확인하세요.

### 배포 실패
→ Vercel Dashboard → Deployments에서 로그를 확인하세요.

### 데이터가 표시되지 않음
→ 브라우저 개발자 도구(F12)의 Console 탭에서 에러 메시지를 확인하세요.

### CORS 오류
→ `api/stock.js`에 CORS 헤더가 설정되어 있습니다. 문제가 지속되면 Vercel 로그를 확인하세요.

## 🛠️ 로컬 개발

로컬에서 테스트하려면:

```bash
# 의존성 설치
npm install

# Vercel CLI 설치 (전역)
npm install -g vercel

# 로컬 개발 서버 시작
vercel dev
```

브라우저에서 `http://localhost:3000` 접속

> **주의**: 로컬 개발 시 환경변수를 `.env` 파일에 설정해야 합니다:
> ```
> KIWOOM_APPKEY=your_app_key
> KIWOOM_SECRETKEY=your_secret_key
> ```

## 📝 라이선스

이 프로젝트는 개인 사용을 위한 것입니다.

## 🙋 도움말

- [Vercel 문서](https://vercel.com/docs)
- [키움증권 API 문서](https://apiportal.kiwoom.com/)
- [GitHub Repository](https://github.com/idhaha/kiwoom_realtimerank)

---

**Made with ❤️ using Vercel**
