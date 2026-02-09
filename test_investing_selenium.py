from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd

url = "https://www.investing.com/rates-bonds/japan-10-year-bond-yield-historical-data"

options = Options()
options.add_argument('--headless=new')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--disable-blink-features=AutomationControlled')
options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

try:
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver.get(url)

    # wait for a table to appear
    WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, 'table')))

    html = driver.page_source
    tables = pd.read_html(html)
    print(f"Found {len(tables)} tables")
    if tables:
        df = tables[0]
        print(df.head())
    driver.quit()
except Exception as e:
    print('Error:', e)
