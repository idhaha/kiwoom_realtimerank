import requests
import pandas as pd
from datetime import datetime

# FRED API로 직접 일본 10년물 국채 금리 데이터 가져오기
# API 키 필요 없음 (기본 요청 가능)

series_id = "IRLTLT01JPM156N"  # 일본 10년물 국채 금리
url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key=&file_type=json"

try:
    # FRED API 호출
    response = requests.get(url, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        
        # 데이터프레임으로 변환
        observations = data.get('observations', [])
        
        # 2020-01-01 이후 데이터만 필터링
        filtered_data = []
        for obs in observations:
            date = obs.get('date')
            value = obs.get('value')
            
            if date and value != '.':
                try:
                    date_obj = datetime.strptime(date, '%Y-%m-%d')
                    if date_obj.year >= 2020 and date_obj <= datetime(2026, 2, 1):
                        filtered_data.append({
                            'Date': date,
                            'Japan_10Y_Rate': float(value)
                        })
                except:
                    pass
        
        df = pd.DataFrame(filtered_data)
        
        if not df.empty:
            df['Date'] = pd.to_datetime(df['Date'])
            df = df.set_index('Date')
            print("일본 10년물 국채 금리 (최근 데이터):")
            print(df.tail(10))
            print(f"\n총 데이터 개수: {len(df)}")
            print(f"날짜 범위: {df.index.min().date()} ~ {df.index.max().date()}")
        else:
            print("필터링된 데이터가 없습니다.")
    else:
        print(f"API 호출 실패: {response.status_code}")
        print(f"응답: {response.text}")
        
except Exception as e:
    print(f"에러 발생: {e}")
