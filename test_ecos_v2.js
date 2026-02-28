const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/ecos?table=817Y002&item=010195000&start=20250201&end=20250228',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            if (data.success && data.data) {
                const rows = data.data;
                console.log(`Fetched ${rows.length} rows.`);
                if (rows.length > 0) {
                    console.log('Last 3 rows:');
                    rows.slice(-3).forEach(r => console.log(`  TIME: ${r.TIME}, VALUE: ${r.DATA_VALUE}`));
                }
            } else {
                console.log('Error or no data:', body.substring(0, 500));
            }
        } catch (e) {
            console.error('Parse error:', e.message);
            console.log('Body start:', body.substring(0, 200));
        }
    });
});
req.on('error', (e) => console.error(`problem: ${e.message}`));
req.end();
