const axios = require('axios');

async function testProxy() {
    const imageUrl = "https://finviz.com/fut_chart.ashx?t=BTC&ty=c&ta=1&p=d&s=l";
    console.log(`Testing URL: ${imageUrl}`);

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://finviz.com/'
            }
        });
        console.log(`Success! Status: ${response.status}, Content-Type: ${response.headers['content-type']}, Length: ${response.data.length}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${error.response.data.toString().substring(0, 100)}`);
        }
    }
}

testProxy();
