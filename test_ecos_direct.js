const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function testEcos(itemCode) {
    const apiKey = process.env.ECOS_APIKEY;
    console.log(`\n--- Testing ECOS Item: ${itemCode} ---`);
    if (!apiKey) { console.log('❌ No ECOS_APIKEY'); return; }

    const table = '817Y002';
    const start = '20250201';
    const end = '20250302';
    const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/10/${table}/D/${start}/${end}/${itemCode}`;

    try {
        const response = await axios.get(url);
        const result = response.data;
        if (result.StatisticSearch && result.StatisticSearch.row) {
            console.log(`✅ Success! Received ${result.StatisticSearch.row.length} rows.`);
            console.log(`Sample:`, JSON.stringify(result.StatisticSearch.row[0]));
        } else {
            const errorMsg = result.RESULT ? result.RESULT.MESSAGE : (result.StatisticSearch ? result.StatisticSearch.RESULT.MESSAGE : 'Unknown');
            console.log(`❌ API Response:`, errorMsg);
        }
    } catch (e) {
        console.log(`❌ Network Error:`, e.message);
    }
}

async function run() {
    await testEcos('010210000'); // User's code
    await testEcos('0102100');   // 7-digit standard
    await testEcos('010195000'); // 2Y User's code
    await testEcos('0101950');   // 2Y standard
}

run();
