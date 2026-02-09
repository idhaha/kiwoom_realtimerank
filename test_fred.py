from fredapi import Fred
import pandas as pd
import datetime

# 발급받은 API Key 입력
fred = Fred(api_key='e9fa11361c1edd09044edac8d9eace29')

# 오늘 날짜와 1년 전 날짜 계산
end_date = datetime.datetime.today()
start_date = end_date - datetime.timedelta(days=365)

try:
    # 미국채 10년물 금리 데이터 가져오기
    dgs10 = fred.get_series('DGS10', observation_start=start_date, observation_end=end_date)
    print("FRED 데이터 가져오기 성공!")
    print(dgs10.tail())
except Exception as e:
    print(f"오류 발생: {e}")
