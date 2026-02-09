import quandl

# 발급받은 API Key 입력
quandl.ApiConfig.api_key = "HLE9YWxukqPE-zuoW45G"

# 일본 10년물 국채 금리 (OECD 데이터, 월별)
japan_10y = quandl.get("FRED/IRLTLT01JPM156N", start_date="2020-01-01", end_date="2026-02-01")

print(japan_10y.tail())
