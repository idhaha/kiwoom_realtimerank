from bojdata import read_boj
import pandas as pd

print("read_boj 함수를 사용한 데이터 조회\n")

# IR01 (Uncollateralized Overnight Call Rate) 조회
try:
    print("[IR01] Uncollateralized Overnight Call Rate\n")
    data = read_boj("IR01")
    print(f"유형: {type(data)}")
    print(f"크기: {len(data) if hasattr(data, '__len__') else 'N/A'}")
    if isinstance(data, pd.DataFrame):
        print(f"\n처음 5행:")
        print(data.head())
    else:
        print(data)
except Exception as e:
    print(f"에러: {e}\n")

# FM08 (Government Bond Yields) 조회
try:
    print("\n" + "="*70)
    print("\n[FM08] Government Bond Yields\n")
    data = read_boj("FM08")
    print(f"유형: {type(data)}")
    print(f"크기: {len(data) if hasattr(data, '__len__') else 'N/A'}")
    if isinstance(data, pd.DataFrame):
        print(f"\n처음 5행:")
        print(data.head())
    else:
        print(data)
except Exception as e:
    print(f"에러: {e}\n")
