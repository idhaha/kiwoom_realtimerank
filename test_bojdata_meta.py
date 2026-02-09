from bojdata import BOJDataAPI
import pandas as pd

boj = BOJDataAPI()

print("FM08 Government Bond Yields 상세 데이터 조회\n")

# FM08의 하위 시리즈/메타데이터 확인
try:
    # 메타데이터 조회
    meta = boj.get_series_metadata("FM08")
    print("메타데이터:")
    print(meta)
    print("\n" + "="*70 + "\n")
    
except Exception as e:
    print(f"메타데이터 에러: {e}\n")

# 직접 데이터 조회 시도 (다양한 범위)
print("데이터 조회 시도 (2020-01-01 ~ 2026-02-09):\n")
try:
    data = boj.get_series("FM08", start="2020-01-01", end="2026-02-09")
    if isinstance(data, dict):
        print(f"반환 타입: dict")
        print(f"키: {data.keys()}")
        print(data)
    elif isinstance(data, pd.DataFrame):
        print(f"✓ DataFrame 반환 (행: {len(data)})")
        print(data)
    else:
        print(f"반환 타입: {type(data)}")
        print(data)
except Exception as e:
    print(f"에러: {e}")
