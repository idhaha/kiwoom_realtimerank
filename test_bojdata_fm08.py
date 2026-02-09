from bojdata import BOJDataAPI
boj = BOJDataAPI()

# yield 관련 시리즈 검색
results = boj.search_series("yield")
print("yield 검색 결과:")
print(results)
print("\n" + "="*70 + "\n")

# FM08 상세 정보
if not results.empty:
    for idx, row in results.iterrows():
        print(f"시리즈 코드: {row['series_code']}")
        print(f"이름: {row['name']}")
        print(f"설명: {row.get('description', 'N/A')}")
        print()

# 이제 FM08로 데이터 조회 시도
print("FM08 데이터 조회 시도:\n")
try:
    data = boj.get_series("FM08", start="2025-12-01", end="2026-01-01")
    print(f"✓ 성공!")
    print(data)
except Exception as e:
    print(f"✗ 에러: {e}")
