import requests
import pandas as pd
import os
from dotenv import load_dotenv

# .env 파일에서 FRED API 키 로드
load_dotenv()
fred_api_key = os.getenv('FRED_APPKEY')

print(f"FRED API 키 확인: {fred_api_key[:10]}..." if fred_api_key else "API 키 없음")

# FRED API로 직접 호출 (API 키 포함)
series_id = "IRLTLT01JPM156N"
url = f"https://api.stlouisfed.org/fred/series/observations"

params = {
    'series_id': series_id,
    'api_key': fred_api_key,
    'file_type': 'json'
}

try:
    print("\nFRED API에서 일본 10년물 국채 금리 데이터 조회 중...\n")
    response = requests.get(url, params=params, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        observations = data.get('observations', [])
        
        # 데이터 처리
        records = []
        for obs in observations:
            date = obs.get('date')
            value = obs.get('value')
            
            if value != '.':  # 유효한 데이터만
                try:
                    records.append({
                        'Date': pd.to_datetime(date),
                        'Rate': float(value)
                    })
                except:
                    pass
        
        if records:
            df = pd.DataFrame(records)
            df = df.set_index('Date')
            
            # 2020-01-01 이후 필터링
            df = df[df.index >= '2020-01-01']
            
            print(f"✓ 성공! 총 {len(df)} 개의 데이터")
            print(f"날짜 범위: {df.index[0].date()} ~ {df.index[-1].date()}")
            print(f"\n최근 데이터:")
            print(df.tail(10))
            print(f"\n데이터 주기: {(df.index[-1] - df.index[-2]).days} 일")
        else:
            print("✗ 유효한 데이터가 없습니다")
    else:
        print(f"✗ API 호출 실패: {response.status_code}")
        print(f"응답: {response.json()}")
        
except Exception as e:
    print(f"✗ 에러: {e}")
