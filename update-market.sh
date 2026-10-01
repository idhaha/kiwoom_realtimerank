#!/bin/bash
# 에러 발생 시 즉시 중단
set -e

echo "=========================================="
echo "🚀 배포 시작: ~/market-through 폴더로 이동..."
echo "=========================================="
cd ~/market-through

echo "📥 1. 원격 저장소에서 최신 코드 및 태그 강제 동기화..."
# --tags를 추가하여 태그 정보도 함께 가져옵니다.
git fetch origin br_oracle --tags
git reset --hard origin/br_oracle

echo "🔎 2. 반영된 최신 정보 확인:"
# 최신 커밋 해시와 메시지 출력
git log -1 --oneline
# 현재 커밋에 연결된 태그명을 출력합니다.
echo "🏷️ 현재 태그: $(git describe --tags --always)"

echo "📦 3. 의존성 설치 (npm ci)..."
# npm ci는 package-lock.json을 기준으로 깨끗하고 빠르게 설치합니다.
npm ci

echo "🔄 4. PM2 프로세스 리로드 및 자동 저장..."
# pm2 reload는 서비스 중단 없이 새로운 코드를 반영합니다.
# 만약 프로세스가 리스트에 없다면(서버 재부팅 등), || 뒤의 start 명령어가 새로 생성해줍니다.
# --update-env는 .env 등의 환경변수 변경사항을 즉시 반영합니다.
pm2 reload market-through --update-env || pm2 start server.js --name market-through

# 현재 실행 중인 PM2 리스트를 저장하여 서버 재부팅 시 자동 실행되도록 합니다.
pm2 save

echo "=========================================="
echo "✅ 배포 및 서버 갱신 완료!"
echo "=========================================="
