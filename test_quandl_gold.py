import quandl as q
api_key = "HLE9YWxukqPE-zuoW45G"
df_gold = q.get("LBMA/GOLD", api_key = api_key)

print(df_gold.tail())
