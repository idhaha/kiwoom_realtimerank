const axios = require('axios');

async function test() {
    const targetUrl = 'https://tradingeconomics.com/japan/government-bond-yield';
    const apiUrl = `http://localhost:3000/api/trading-economics?url=${encodeURIComponent(targetUrl)}`;

    console.log(`Testing scraping for: ${targetUrl}`);
    console.log(`API URL: ${apiUrl}`);

    try {
        const response = await axios.get(apiUrl, { timeout: 60000 }); // Long timeout for Puppeteer
        console.log('Response status:', response.status);
        if (response.data.success) {
            console.log('✅ Success! Data points:', response.data.data.length);
            if (response.data.data.length > 0) {
                console.log('First point:', response.data.data[0]);
                console.log('Last point:', response.data.data[response.data.data.length - 1]);
            }
        } else {
            console.log('❌ Failed:', response.data);
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
        if (e.response) {
            console.error('Response data:', e.response.data);
        }
    }
}

test();
