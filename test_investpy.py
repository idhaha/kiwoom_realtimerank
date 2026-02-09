import investpy

# 일본 10년물 국채 금리 (예시)
japan_10y = investpy.bonds.get_bond_historical_data(
    bond='Japan 10Y',
    from_date='01/02/2025',
    to_date='01/02/2026'
)

print(japan_10y.tail())
