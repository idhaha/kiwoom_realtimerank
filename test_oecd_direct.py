import requests
import pandas as pd

print("OECD SDMX API를 통한 일본 국채금리 조회\n")
print("="*60)

# OECD SDMX-JSON API
# 데이터셋: IRLTLT01 (10년물 국고채 수익률)
# 국가: JPN (일본)

url = "https://stats.oecd.org/sdmx-json/data/IRLTLT01/JPN"

try:
    print("\nOECD에서 일본 국채금리 데이터 조회 중...")
    response = requests.get(url, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        
        # SDMX-JSON 형식 파싱
        if 'data' in data and 'observations' in data['data']:
            print("✓ 데이터 접근 성공!")
            
            # 시간 정보 추출
            dimensions = data['dimension']
            time_index = dimensions['id'].index('TIME_PERIOD')
            
            obs = data['data']['observations']
            records = []
            
            for key, values in obs.items():
                indices = key.split(':')
                time_val = dimensions['observation'][0][indices[0]][0]
                
                if values and values[0] is not None:
                    records.append({
                        'Date': time_val,
                        'Rate': float(values[0])
                    })
            
            if records:
                df = pd.DataFrame(records)
                df['Date'] = pd.to_datetime(df['Date'])
                df = df.sort_values('Date')
                df = df.set_index('Date')
                
                print(f"\n✓ 총 {len(df)} 개의 데이터")
                print(f"날짜 범위: {df.index[0].date()} ~ {df.index[-1].date()}")
                print(f"\n최근 데이터 (10개):")
                print(df.tail(10))
            else:
                print("✗ 유효한 데이터가 없습니다")
        else:
            print("✗ 데이터 구조 파싱 실패")
            print("응답 샘플:", str(response.json())[:200])
    else:
        print(f"✗ API 호출 실패: {response.status_code}")
        
except Exception as e:
    print(f"✗ 에러: {e}")

print("\n" + "="*60)
print("\n참고: OECD는 월별 데이터만 제공합니다.")
print("일별 데이터는 일본 재무성이나 BOJ에서 제공합니다.")
