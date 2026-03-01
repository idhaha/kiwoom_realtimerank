const http = require('http');

const url = 'https://tradingeconomics.com/japan/government-bond-yield';
const proxyPath = `/api/trading-economics?url=${encodeURIComponent(url)}&duration=${encodeURIComponent('10년')}`;

const options = {
    hostname: 'localhost',
    port: 3001,
    path: proxyPath,
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(body);
            if (result.success && result.data) {
                const data = result.data;
                console.log(`Fetched ${data.length} points.`);
                if (data.length > 0) {
                    console.log('Last 10 points:');
                    data.slice(-10).forEach(d => {
                        console.log(`  Date: ${d.DateTime || d.date}, Value: ${d.Value || d.value}`);
                    });
                }
            } else {
                console.log('API Error:', result.error || 'Unknown error');
                if (result.details) console.log('Details:', result.details);
            }
        } catch (e) {
            console.error('Parse error:', e.message);
            console.log('Body start:', body.substring(0, 500));
        }
    });
});

req.on('error', (e) => console.error(`Problem: ${e.message}`));
req.end();
