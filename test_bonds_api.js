const http = require('http');

async function testApi(name, path) {
    return new Promise((resolve) => {
        console.log(`\n--- Testing ${name}: ${path} ---`);
        const options = {
            hostname: '127.0.0.1',
            port: 3001,
            path: encodeURI(path),
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const data = JSON.parse(body);
                        if (data.success) {
                            console.log(`✅ Success! Received ${data.data?.length || 0} points.`);
                            if (data.data?.length > 0) {
                                console.log(`Sample:`, JSON.stringify(data.data[0]));
                            }
                        } else {
                            console.log(`❌ API Error:`, data.error);
                        }
                    } catch (e) {
                        console.log(`❌ Parse Error:`, e.message);
                        console.log(`Body:`, body.substring(0, 200));
                    }
                } else {
                    console.log(`❌ Failed:`, body.substring(0, 200));
                }
                resolve();
            });
        });
        req.on('error', (e) => {
            console.log(`❌ Socket Error: ${e.message}`);
            resolve();
        });
        req.end();
    });
}

async function runTests() {
    // US Bonds (FRED)
    await testApi("FRED US 10Y", "/api/fred?series_id=DGS10&period=10년");
    await testApi("FRED US 2Y", "/api/fred?series_id=DGS2&period=10년");

    // Korea Bonds (ECOS)
    // 010210000: Treasury Bond (10Y), 010195000: Treasury Bond (2Y)
    await testApi("ECOS KR 10Y", "/api/ecos?table=817Y002&item=010210000&start=20240302&end=20260302");
    await testApi("ECOS KR 2Y", "/api/ecos?table=817Y002&item=010195000&start=20240302&end=20260302");
}

runTests();
