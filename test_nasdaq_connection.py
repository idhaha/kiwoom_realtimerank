import requests

nasdaq_api_key = "HLE9YWxukqPE-zuoW45G"

print("NASDAQ Data Link API 연결 테스트\n")

# 1. API 키 검증 테스트
print("1️⃣ API 키 유효성 확인:")
try:
    url = "https://data.nasdaq.com/api/v3/datasets.json"
    params = {'api_key': nasdaq_api_key}
    response = requests.get(url, params=params, timeout=5)
    print(f"   상태: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ API 키가 유효합니다")
        print(f"   데이터셋 개수: {len(data.get('datasets', []))}")
    else:
        print(f"   ✗ 에러: {response.status_code}")
except Exception as e:
    print(f"   ✗ {e}")

# 2. 다양한 엔드포인트 시도
print("\n2️⃣ 다양한 엔드포인트 시도:")

endpoints = [
    ("기본 API", "https://data.nasdaq.com/api/v3/"),
    ("Quandl (구 호스트)", "https://www.quandl.com/api/v3/"),
]

for name, base_url in endpoints:
    try:
        url = f"{base_url}datasets.json"
        params = {'api_key': nasdaq_api_key}
        response = requests.head(url, params=params, timeout=5)
        print(f"   {name}: {response.status_code}")
    except Exception as e:
        print(f"   {name}: {str(e)[:40]}")

# 3. 구 Quandl API로 시도
print("\n3️⃣ Quandl Python 라이브러리 (구 호스트)로 재시도:")
print("   참고: API 키 문제일 수 있습니다.")
print("   https://data.nasdaq.com/account/profile에서")
print("   API 키를 다시 확인하세요.")
