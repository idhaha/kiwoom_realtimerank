from bojdata import BOJDataAPI
boj = BOJDataAPI()

# 시리즈 검색
print("BOJ 시리즈 검색 중...\n")
results = boj.search_series("JGB")
print(f"검색 결과 (JGB):\n")
print(results)
print("\n" + "="*70 + "\n")

# 다른 검색어로 시도
results2 = boj.search_series("yield")
print(f"검색 결과 (yield):\n")
print(results2)
