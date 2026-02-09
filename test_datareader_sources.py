import pandas_datareader as pdr
import datetime

print("pandas_datareader 지원 데이터 소스:\n")
print("- FRED (연방준비제도)")
print("- OECD (경제협력개발기구)")
print("- World Bank (세계은행)")
print("- Eurostat (유로통계청)")
print("- Yahoo Finance")
print("- Google Finance")
print("\n" + "="*60 + "\n")

# 조회 기간 설정
start = datetime.datetime(2020, 1, 1)
end = datetime.datetime(2026, 2, 1)

# 1. OECD에서 일본 국채금리 가져오기
print("1️⃣ OECD 데이터 소스 시도:\n")

try:
    print("OECD에서 데이터 조회 중...")
    # OECD 데이터셋: IRLTLT01 (10년물 국고채 수익률)
    # 국가 코드: JPN (일본)
    
    # pandas_datareader로 OECD 접근
    japan_10y = pdr.data.get_data_oecd(
        dataset="IRLTLT01",
        access_key=None  # OECD는 API 키 불필요
    )
    
    print("✓ 성공!")
    print(japan_10y.tail())
    
except Exception as e:
    print(f"✗ 실패: {str(e)[:100]}")

# 2. World Bank 시도
print("\n" + "="*60)
print("\n2️⃣ World Bank 데이터 소스 시도:\n")

try:
    print("World Bank에서 데이터 조회 중...")
    # World Bank 지표: NY.GDP.DEFL.ZS 등
    wdi_data = pdr.data.get_data_world_bank(
        indicators=['FR.INR.LEND'],  # 대출 금리
        countries=['JPN'],
        start=2020,
        end=2026
    )
    
    print("✓ 성공!")
    print(wdi_data.tail())
    
except Exception as e:
    print(f"✗ 실패: {str(e)[:100]}")

print("\n" + "="*60)
print("\n참고: pandas_datareader의 정확한 OECD 접근 방법은")
print("버전에 따라 다를 수 있습니다.")
