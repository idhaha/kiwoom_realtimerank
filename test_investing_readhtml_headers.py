import requests
import pandas as pd

url = "https://www.investing.com/rates-bonds/japan-10-year-bond-yield-historical-data"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

resp = requests.get(url, headers=headers, timeout=15)
print(f"HTTP {resp.status_code}")

if resp.status_code == 200:
    tables = pd.read_html(resp.text)
    df = tables[0]
    print(df.head())
else:
    print("Failed to fetch page; response length:", len(resp.text))
