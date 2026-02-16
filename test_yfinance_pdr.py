import FinanceDataReader as fdr
import yfinance as yf

# 1. FinanceDataReader로 일본 지수/환율 확인 (국채는 직접 지원 X)
nikkei = fdr.DataReader('2561.T', '2025-02-01', '2026-02-01')
print(nikkei.head())

# 2. yfinance로 일본 10년물 국채 금리 가져오기
# jgb10y = yf.Ticker("2561.T")
# jgb2y = yf.Ticker("236A.T")

# data = jgb2y.history(period="1y", interval="1d")
# print(data.head())

# data = jgb10y.history(period="1y", interval="1d")
# print(data.head())

