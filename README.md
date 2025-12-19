# 키움증권 실시간종목조회순위 웹서비스

Firebase를 활용한 키움증권 실시간종목조회순위 데이터 표시 웹 애플리케이션입니다.

## 📋 기능

- ✅ 키움증권 REST API를 통한 실시간종목조회순위 데이터 조회
- ✅ 자동 새로고침 (30초 간격)
- ✅ 현대적이고 아름다운 다크모드 UI
- ✅ 반응형 디자인 (모바일/태블릿/데스크톱)
- ✅ Firebase Functions로 안전한 API 키 관리
- ✅ Firebase Hosting으로 빠른 배포

## 🏗️ 프로젝트 구조

```
d:\Program\Kiwoom\
├── functions/              # Firebase Functions (백엔드)
│   ├── index.js           # 키움 API 호출 로직
│   └── package.json       # 백엔드 의존성
├── public/                # Firebase Hosting (프론트엔드)
│   ├── index.html         # 메인 HTML
│   ├── style.css          # 스타일시트
│   └── app.js             # 클라이언트 JavaScript
├── firebase.json          # Firebase 설정
└── .firebaserc            # Firebase 프로젝트 ID
```

## 🚀 시작하기

### 1. 사전 준비

- Node.js 18 이상 설치
- Firebase CLI 설치
  ```bash
  npm install -g firebase-tools
  ```

### 2. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. 프로젝트 ID를 복사

### 3. 프로젝트 설정

1. `.firebaserc` 파일 수정
   ```json
   {
     "projects": {
       "default": "여기에_실제_프로젝트_ID_입력"
     }
   }
   ```

2. `public/app.js` 파일에서 API URL 수정
   ```javascript
   // YOUR_PROJECT_ID를 실제 프로젝트 ID로 변경
   const API_URL = 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getStockRanking';
   ```

### 4. Firebase 로그인

```bash
firebase login
```

### 5. 의존성 설치

```bash
cd functions
npm install
cd ..
```

### 6. 환경변수 설정

키움 API 키를 Firebase Functions 환경변수로 설정:

```bash
firebase functions:config:set kiwoom.appkey="발급받은_APP_KEY" kiwoom.secretkey="발급받은_SECRET_KEY"
```

### 7. 로컬 테스트 (선택사항)

Firebase 에뮬레이터로 로컬 테스트:

```bash
firebase emulators:start
```

브라우저에서 `http://localhost:5000` 접속

> **주의**: 로컬 테스트 시 환경변수가 작동하지 않을 수 있습니다. 실제 배포 후 테스트를 권장합니다.

### 8. 배포

```bash
firebase deploy
```

배포가 완료되면 Hosting URL이 표시됩니다:
```
Hosting URL: https://YOUR_PROJECT_ID.web.app
```

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

## 📊 Firebase 무료 플랜 한도

이 프로젝트는 Firebase 무료 플랜(Spark Plan)으로 충분히 운영 가능합니다:

- **Functions 호출**: 월 2,000,000회 (충분함!)
- **Hosting 전송량**: 월 10GB
- **Functions 실행 시간**: 월 400,000 GB-초

## 🔧 문제 해결

### 환경변수 오류
```
API 키가 설정되지 않았습니다
```
→ `firebase functions:config:set` 명령으로 환경변수를 설정했는지 확인하세요.

### CORS 오류
→ Firebase Functions에 CORS가 설정되어 있습니다. 문제가 지속되면 Firebase Console에서 Functions 로그를 확인하세요.

### 데이터가 표시되지 않음
→ 브라우저 개발자 도구(F12)의 Console 탭에서 에러 메시지를 확인하세요.

## 📝 라이선스

이 프로젝트는 개인 사용을 위한 것입니다.

## 🙋 도움말

- [Firebase 문서](https://firebase.google.com/docs)
- [키움증권 API 문서](https://apiportal.kiwoom.com/)

---

**Made with ❤️ using Firebase**
