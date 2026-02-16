const axios = require('axios');

async function test(label, url) {
    console.log(`\n--- Testing (${label}): ${url} ---`);
    try {
        const response = await axios.get(url, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://tradingeconomics.com/'
            }
        });
        console.log(`Status: ${response.status}`);
        const data = response.data;
        if (typeof data === 'string') {
            const snippet = data.substring(0, 100).trim();
            console.log(`Data Type: String (Length: ${data.length})`);
            console.log(`Snippet: ${snippet}`);
        } else {
            console.log(`Data Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
            console.log(`Sample: ${JSON.stringify(Array.isArray(data) ? data.slice(0, 1) : data).substring(0, 200)}`);
        }
    } catch (e) {
        console.log(`Error: ${e.message} (Status: ${e.response?.status})`);
    }
}

async function run() {
    // 1. Japan GDP (Very common, might be more open)
    await test('Japan GDP', 'https://api.tradingeconomics.com/historical/country/japan/indicator/gdp?c=guest:guest');

    // 2. Japan CPI (Common)
    await test('Japan CPI', 'https://api.tradingeconomics.com/historical/country/japan/indicator/consumer%20price%20index?c=guest:guest');

    // 3. Different maturity yield (5Y)
    await test('Japan 5Y Yield', 'https://api.tradingeconomics.com/historical/country/japan/indicator/government%20bond%205y?c=guest:guest');

    // 4. US Inflation Rate (Very common)
    await test('US Inflation', 'https://api.tradingeconomics.com/historical/country/united%20states/indicator/inflation%20rate?c=guest:guest');
}

run();
