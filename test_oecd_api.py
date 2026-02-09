import requests
import pandas as pd
from datetime import datetime

# OECD Stats API
# 일본 10년물 국채금리: IRLTLT01/JPN

url = "https://stats.oecd.org/sdmx-json/data/IRLTLT01/JPN"

try:
    print("OECD에서 일본 10년물 국채금리 데이터 가져오는 중...\n")
    response = requests.get(url, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        
        # 데이터 구조 파싱
        if 'data' in data and 'observations' in data['data']:
            obs_data = []
            
            # 시간 차원 가져오기
            time_index = data['dimension']['id'].index('TIME_PERIOD')
            
            for idx, dims in enumerate(data['dimension']['observation'][0]):
                for time_key, values in dims.items():
                    for val_idx, val in enumerate(values):
                        if val_idx == 0:  # 첫 번째 관측값
                            obs_data.append({
                                'date': time_key,
                                'rate': val
                            })
            
            df = pd.DataFrame(obs_data)
            print("✓ 데이터 취득 성공!")
            print(f"데이터 개수: {len(df)}")
            print(f"\n최근 데이터:")
            print(df.tail(10))
        else:
            print("응답 구조:")
            print(response.json())
    else:
        print(f"✗ API 호출 실패: {response.status_code}")
        print(f"응답: {response.text[:500]}")
        
except Exception as e:
    print(f"에러: {e}")
    print("\n※ 참고: OECD Stats API의 정확한 형식을 확인하려면")
    print("https://data.oecd.org/ 문서를 참고하세요.")
