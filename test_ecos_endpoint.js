const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000, // Assuming port 3000 as per common practice, check server.js if different
    path: '/api/ecos?table=817Y002&item=010195000&start=20230101&end=20231231',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk.substring(0, 200)}...`); // Print first 200 chars
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
