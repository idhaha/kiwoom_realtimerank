const axios = require('axios');
const fs = require('fs');

async function fetchAdr() {
    try {
        const response = await axios.get('http://adrinfo.kr/chart', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        fs.writeFileSync('adr_debug.txt', response.data);
        console.log('Saved to adr_debug.txt');
    } catch (e) {
        console.error(e.message);
    }
}
fetchAdr();
