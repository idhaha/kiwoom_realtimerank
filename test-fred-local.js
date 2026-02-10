const axios = require('axios');

async function testFred() {
    const seriesId = "DGS10";
    const period = "1년";
    const url = `http://localhost:3001/api/fred?series_id=${seriesId}&period=${encodeURIComponent(period)}`;

    console.log(`📡 Fetching: ${url}`);
    try {
        const response = await axios.get(url);
        console.log("✅ Success!");
        console.log("Data sample:", JSON.stringify(response.data, null, 2).substring(0, 500) + "...");
    } catch (error) {
        console.error("❌ Failed!");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Message:", error.message);
        }
    }
}

testFred();
