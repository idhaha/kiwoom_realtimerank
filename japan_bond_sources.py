import requests
import pandas as pd
from datetime import datetime

print("일본 국채금리 일별 데이터 소스 탐색\n")
print("="*60)

# 1. Trading Economics API (무료 제한)
print("\n1️⃣ Trading Economics - Japan 10Y Bond Yield")
try:
    url = "https://tradingeconomics.com/japan/government-bond-yield"
    response = requests.get(url, timeout=5)
    print(f"   상태: {response.status_code} (웹 페이지, 스크래핑 필요)")
except Exception as e:
    print(f"   ✗ {str(e)[:50]}")

# 2. Quandl API (무료 계획 있음)
print("\n2️⃣ Quandl - 일본 국채 데이터")
print("   특징: 무료 API 키 필요, 다양한 채권 데이터 제공")
print("   URL: https://www.quandl.com/")

# 3. Alpha Vantage
print("\n3️⃣ Alpha Vantage - 채권 데이터")
print("   특징: 무료 API 키 제공, 제한적 데이터")
print("   URL: https://www.alphavantage.co/")

# 4. InflationData
print("\n4️⃣ InflationData - 국채 수익률")
try:
    url = "https://www.inflation.eu/inflation-rates/japan.html"
    response = requests.get(url, timeout=5)
    print(f"   상태: {response.status_code} (웹 스크래핑 가능)")
except Exception as e:
    print(f"   ✗ {str(e)[:50]}")

# 5. 일본 재무성 (MOF Japan)
print("\n5️⃣ 일본 재무성 (Ministry of Finance Japan)")
print("   특징: 공식 데이터, 일별 국채 수익률")
print("   URL: https://www.mof.go.jp/")
print("   데이터: 일본 국고채 유통수익률 (일별)")

# 6. Bloomberg 또는 Reuters (유료)
print("\n6️⃣ Bloomberg / Reuters")
print("   특징: 유료 (가장 정확한 실시간 데이터)")

print("\n" + "="*60)
print("\n💡 권장: 일본 재무성 또는 웹 스크래핑 기반 수집")
print("   또는 유료 API (Bloomberg, FactSet 등)")
