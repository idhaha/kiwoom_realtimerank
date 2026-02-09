from bojdata import BOJDataAPI
boj = BOJDataAPI()
data = boj.get_series("JP10Y", start="2025-12-01", end="2026-01-01")
print(data)
