import requests
import pandas as pd

print("OECD 국채금리 데이터 조회\n")

# 다양한 OECD API 형식 시도
endpoints = [
    "https://stats.oecd.org/sdmx-json/data/IRLTLT01/JPN",
    "https://stats.oecd.org/restsdmx/v1/GetData/IRLTLT01/JPN",
    "https://data.oecd.org/api/call/oecd/irltlt01/jpn"
]

for url in endpoints:
    try:
        print(f"▪ {url.split('/')[-2]}... ", end="")
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            print(f"✓ (상태: {response.status_code})")
            # 데이터 샘플
            if 'json' in url:
                print(f"  형식: JSON API")
            print(f"  응답 크기: {len(response.text)} bytes\n")
        else:
            print(f"✗ (상태: {response.status_code})")
    except Exception as e:
        print(f"✗ ({str(e)[:30]})")

print("\n---")
print("※ OECD가 무료 API를 제공하지만, 정확한 엔드포인트와")
print("  데이터 형식은 OECD 공식 문서에서 확인이 필요합니다.")
print("\n권장: 더 안정적인 FRED API (무료 API 키 필요)")
print("      https://fred.stlouisfed.org/docs/api/api_key.html")
