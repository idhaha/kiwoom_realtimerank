from bojdata import BOJDataAPI
import pandas as pd

boj = BOJDataAPI()

# 모든 시리즈 검색
print("BOJ 전체 시리즈 검색 중 (시간이 걸릴 수 있음)...\n")
try:
    all_series = boj.search_series("")  # 빈 검색으로 모든 시리즈 조회
    print(f"총 {len(all_series)} 개의 시리즈 찾음\n")
    
    # 10Y, 10-year, 10년 관련 필터링
    print("10년 관련 시리즈:")
    for idx, row in all_series.iterrows():
        name = str(row.get('name', ''))
        code = str(row.get('series_code', ''))
        if any(x in name.lower() for x in ['10', 'ten', '10-y', '10y']):
            print(f"  {code}: {name}")
    
    print("\n" + "="*70)
    print("\nGovernment Bond 관련 시리즈:")
    for idx, row in all_series.iterrows():
        name = str(row.get('name', ''))
        code = str(row.get('series_code', ''))
        if 'government' in name.lower() or 'bond' in name.lower() or 'jgb' in name.lower():
            print(f"  {code}: {name}")
    
    print("\n" + "="*70)
    print("\n처음 30개 시리즈:")
    for idx, row in all_series.head(30).iterrows():
        print(f"  {row.get('series_code')}: {row.get('name')}")
        
except Exception as e:
    print(f"에러: {e}")
