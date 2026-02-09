import pandas as pd

url = "https://www.investing.com/rates-bonds/japan-10-year-bond-yield-historical-data"
tables = pd.read_html(url)

# 첫 번째 테이블이 일별 데이터
df = tables[0]
print(df.head())
