import sys
import os
import json
import datetime
from fredapi import Fred
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

def get_fred_data(series_id, period_str):
    api_key = os.getenv('FRED_APPKEY')
    if not api_key:
        print(json.dumps({"success": False, "error": "FRED_APPKEY not found in .env"}))
        return

    fred = Fred(api_key=api_key)
    
    end_date = datetime.datetime.today()
    
    # 기간 계산
    days = 365 # 기본 1년
    period_str = period_str or '1년'
    #if '10년' in period_str:
    if any(keyword in period_str for keyword in ['10년', '10y', '10Y']):
        days = 365 * 10
    elif any(keyword in period_str for keyword in ['5년', '5y', '5Y']):
        days = 365 * 5
    elif any(keyword in period_str for keyword in ['2년', '2y', '2Y']):
        days = 365 * 2
    elif any(keyword in period_str for keyword in ['6개월', '6m', '6M']):
        days = 180
    elif any(keyword in period_str for keyword in ['1년', '1y', '1Y']):
        days = 365
        
    start_date = end_date - datetime.timedelta(days=days)
    
    try:
        # FRED 데이터 가져오기
        series = fred.get_series(series_id, observation_start=start_date, observation_end=end_date)
        
        # 데이터프레임 변환 (NaN 제거)
        df = series.dropna()
        
        # JSON 형식으로 변환
        result = []
        for date, value in df.items():
            result.append({
                "date": date.strftime('%Y-%m-%d'),
                "value": float(value)
            })
            
        print(json.dumps({"success": True, "data": result}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: python fred_api.py <series_id> [period_str]"}))
    else:
        series_id = sys.argv[1]
        period_str = sys.argv[2] if len(sys.argv) > 2 else '1년'
        get_fred_data(series_id, period_str)
