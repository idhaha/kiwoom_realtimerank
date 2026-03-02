const axios = require('axios');

async function testScraper() {
    const url = 'https://tradingeconomics.com/south-korea/currency';
    const proxyUrl = `http://127.0.0.1:3001/api/trading-economics?url=${encodeURIComponent(url)}`;

    console.log('--- Testing Trading Economics Scraper ---');
    console.log(`URL: ${proxyUrl}`);

    try {
        const response = await axios.get(proxyUrl);
        const data = response.data;

        if (data.success) {
            console.log('✅ Scraper returned success.');
            console.log(`Total points: ${data.data.length}`);

            const lastPoints = data.data.slice(-5);
            console.log('Last 5 points:');
            lastPoints.forEach(p => console.log(`  ${p.DateTime}: ${p.Value}`));

            const now = new Date();
            const lastDate = new Date(lastPoints[lastPoints.length - 1].DateTime);

            if (lastDate > now) {
                console.log('⚠️ Warning: Future date detected!');
            } else {
                console.log('✅ No future date detected in top-level data.');
            }
        } else {
            console.error('❌ Scraper failed:', data.error || data.details);
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testScraper();
