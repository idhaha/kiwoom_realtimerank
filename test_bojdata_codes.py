from bojdata import BOJDataAPI

boj = BOJDataAPI()

# 가능한 시리즈 코드들 시도
codes_to_try = ["CP01", "FM08", "IR01", "IR02", "IR03"]

for code in codes_to_try:
    print(f"\n[{code}] 시도 중:")
    try:
        data = boj.get_series(code, start="2025-12-01", end="2026-01-01")
        print(f"  유형: {type(data)}")
        if isinstance(data, dict):
            print(f"  키: {list(data.keys())[:5]}")
            print(f"  title: {data.get('title')}")
        else:
            print(f"  데이터: {data}")
    except Exception as e:
        print(f"  ✗ 에러: {str(e)[:80]}")
