import quandl
quandl.ApiConfig.api_key = "HLE9YWxukqPE-zuoW45G"
data = quandl.get("FRED/DGS10")

print(data.tail())
