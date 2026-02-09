"""
일본 국채금리 일별 데이터를 제공하는 무료/유료 API 비교
"""

import requests

print("일본 국채금리 일별 데이터 제공 API 테스트\n")
print("="*70)

# 1. EOD Historical Data API (무료 제한)
print("\n1️⃣ EOD Historical Data")
print("   - 채권 일별 데이터 제공")
print("   - URL: https://eodhd.com/")
print("   - 심볼: JPY.IRLTLT01 또는 유사")
print("   - 무료 API 키: https://eodhd.com/register")

# 2. AlphaVantage (무료)
print("\n2️⃣ AlphaVantage")
print("   - 제한적인 채권 데이터")
print("   - URL: https://www.alphavantage.co/")
print("   - 무료 API 키 제공")

# 3. IEX Cloud (무료 계획)
print("\n3️⃣ IEX Cloud")
print("   - 다양한 금융 데이터")
print("   - URL: https://iexcloud.io/")
print("   - 무료 계획: 100,000 메시지/월")

# 4. Polygon.io (무료 계획)
print("\n4️⃣ Polygon.io")
print("   - 주식, 암호화폐, 외환 데이터")
print("   - URL: https://polygon.io/")
print("   - 무료 API 키 제공")

# 5. 일본 재무성 웹 스크래핑
print("\n5️⃣ 일본 재무성 (MOF)")
print("   - 공식 국채 유통수익률 (일별)")
print("   - URL: https://www.mof.go.jp/")
print("   - 방법: 웹 스크래핑")

# 6. Trading Economics (웹 스크래핑)
print("\n6️⃣ Trading Economics")
print("   - URL: https://tradingeconomics.com/")
print("   - 일본 10Y 채권 수익률 (일별)")
print("   - 방법: BeautifulSoup 스크래핑")

# 7. Yahoo Finance (yfinance로 불가능하지만 직접 스크래핑 가능)
print("\n7️⃣ Yahoo Finance")
print("   - ^TNX (미국 10Y), ^TYX (일본 관련)")
print("   - 방법: Selenium 또는 웹 스크래핑")

print("\n" + "="*70)
print("\n💡 추천순서:")
print("   1. EOD Historical Data - 가장 안정적")
print("   2. 일본 재무성 웹 스크래핑 - 공식 데이터")
print("   3. Trading Economics 스크래핑 - 접근 가능")

print("\n다음 중 어느 것으로 테스트해볼까요?")
