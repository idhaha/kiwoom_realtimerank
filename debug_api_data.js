const axios = require('axios');

async function debugData() {
    const urls = [
        'https://tradingeconomics.com/south-korea/currency',
        'https://tradingeconomics.com/japan/government-bond-yield'
    ];

    for (const url of urls) {
        const proxyUrl = `http://127.0.0.1:3001/api/trading-economics?url=${encodeURIComponent(url)}`;
        console.log(`\n--- Debugging: ${url} ---`);
        try {
            const resp = await axios.get(proxyUrl);
            const data = resp.data;
            if (data.success) {
                const points = data.data;
                console.log(`Success! Total points: ${points.length}`);

                // Show last 5 points with human dates
                const last5 = points.slice(-5);
                last5.forEach((p, i) => {
                    const d = new Date(p.DateTime);
                    console.log(`  [${i}] ${p.DateTime} (${d.toLocaleString()}) -> ${p.Value}`);
                });

                const now = new Date();
                console.log(`Current Time: ${now.toLocaleString()}`);
            } else {
                console.log(`Scraper Error: ${data.error}`);
            }
        } catch (e) {
            console.log(`Request Error: ${e.message}`);
        }
    }
}

debugData();
