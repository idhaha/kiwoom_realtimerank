import requests
from bs4 import BeautifulSoup
import pandas as pd

# 일본 재무성 국채 수익률 페이지
url = "https://www.mof.go.jp/english/jgbs/publication/debt_management/index.html"

print("일본 재무성(MOF)에서 국채 수익률 데이터 조회 중...\n")

try:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers, timeout=10)
    print(f"응답 상태: {response.status_code}\n")
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 페이지 내용 일부 출력
        print("페이지 타이틀:")
        if soup.title:
            print(soup.title.string)
        
        print("\n페이지 구조 확인 (테이블 찾기):")
        tables = soup.find_all('table')
        print(f"찾은 테이블 개수: {len(tables)}\n")
        
        if tables:
            for i, table in enumerate(tables[:2]):  # 처음 2개 테이블만 출력
                print(f"테이블 {i+1}:")
                print(table.get_text()[:500])  # 처음 500자만
                print("...")
                print("-"*70 + "\n")
        
        # 링크 찾기 (일일 데이터 링크)
        print("\n찾은 링크들:")
        links = soup.find_all('a', href=True)
        for link in links[:10]:
            if 'yield' in link.get_text().lower() or 'daily' in link.get_text().lower():
                print(f"  {link.get_text()}: {link['href']}")
    else:
        print(f"✗ 요청 실패: {response.status_code}")
        
except Exception as e:
    print(f"✗ 에러: {e}")
