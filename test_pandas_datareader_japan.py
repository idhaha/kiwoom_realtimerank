import pandas_datareader.data as web
import datetime

# 조회 기간 설정
start = datetime.datetime(2020, 1, 1)
end = datetime.datetime(2026, 2, 1)

# 일본 10년물 국채 금리 (OECD 데이터, 월별)
japan_10y = web.DataReader("IRLTLT01JPM156N", "fred", start, end)

print(japan_10y.tail())
