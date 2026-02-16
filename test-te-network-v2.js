const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled' // Hide automation flag
        ]
    });
    const page = await browser.newPage();

    // Set a realistic User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set extra headers
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
        'Referer': 'https://tradingeconomics.com/'
    });

    const url = 'https://tradingeconomics.com/south-korea/currency';

    const requests = [];

    await page.setRequestInterception(true);
    page.on('request', request => {
        request.continue();
    });

    page.on('response', async response => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';

        // Log all responses to see if we get 200 OK
        if (url.includes('south-korea') || url.includes('currency') || contentType.includes('json')) {
            requests.push({
                url: url,
                contentType: contentType,
                status: response.status()
            });
        }
    });

    try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log(`Captured ${requests.length} responses.`);
        fs.writeFileSync('te-network-log-v2.json', JSON.stringify(requests, null, 2));

        // Check Highcharts again
        const chartAvailable = await page.evaluate(() => {
            return !!(window.Highcharts && window.Highcharts.charts && window.Highcharts.charts.length > 0);
        });
        console.log(`Highcharts available: ${chartAvailable}`);
        fs.appendFileSync('te-network-log-v2.json', `\n// Highcharts available: ${chartAvailable}`);

    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync('te-network-error-v2.txt', error.toString());
    } finally {
        await browser.close();
    }
})();
