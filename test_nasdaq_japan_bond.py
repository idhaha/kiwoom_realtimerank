import requests
import pandas as pd

nasdaq_api_key = "HLE9YWxukqPE-zuoW45G"

print("NASDAQ Data Link API로 일본 국채금리 검색\n")
print("="*70)

# NASDAQ Data Link (Quandl) API 엔드포인트
# 데이터셋 검색을 통해 일본 국채 데이터를 찾아보기

# 시도할 수 있는 데이터셋 코드들
datasets = [
    "FRED/IRLTLT01JPM156N",      # FRED를 통한 월별 (이미 시도함)
    "BOJ/IRLTLT01JPY",            # 일본 은행 (BOJ) 데이터
    "OECD/JPN_IRLTLT01",          # OECD 데이터
    "WORLDBANK/JPN_TNY_RLND",     # 월드뱅크 데이터
]

print("시도할 데이터셋:\n")

for dataset_code in datasets:
    try:
        print(f"▪ {dataset_code}... ", end="", flush=True)
        
        url = f"https://data.nasdaq.com/api/v3/datasets/{dataset_code}"
        params = {
            'api_key': nasdaq_api_key,
            'start_date': '2020-01-01',
            'end_date': '2026-02-01'
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            dataset_meta = data.get('dataset', {})
            
            print(f"✓ 존재!")
            print(f"  설명: {dataset_meta.get('description', 'N/A')[:60]}")
            print(f"  주기: {dataset_meta.get('frequency', 'N/A')}")
            print(f"  컬럼: {dataset_meta.get('column_names', [])}\n")
            
            # 실제 데이터 가져오기
            if len(data.get('dataset', {}).get('data', [])) > 0:
                print(f"  샘플 데이터 (최근 3개):")
                for row in data['dataset']['data'][-3:]:
                    print(f"    {row}")
                print()
        else:
            print(f"✗ (상태: {response.status_code})")
            if response.status_code == 404:
                print(f"  데이터셋을 찾을 수 없습니다.")
    except Exception as e:
        print(f"✗ ({str(e)[:40]})")

print("\n" + "="*70)
print("\n💡 더 많은 데이터셋을 찾으려면:")
print("   https://data.nasdaq.com/search?query=japan+bond")
print("   또는 API 문서:")
print("   https://docs.data.nasdaq.com/")
