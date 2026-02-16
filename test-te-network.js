const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const url = 'https://tradingeconomics.com/south-korea/currency';

    const requests = [];

    await page.setRequestInterception(true);
    page.on('request', request => {
        request.continue();
    });

    page.on('response', async response => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';

        if (url.includes('south-korea') || url.includes('currency') || url.includes('chart') || url.includes('api') || contentType.includes('json')) {
            if (!url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.jpg')) {
                try {
                    // Only try to get text for text-based responses
                    if (contentType.includes('json') || contentType.includes('text')) {
                        // Don't await text() here as it might block or fail for some resources
                        // We just log the URL for now. 
                        // To inspect content, we might need a more targeted approach.
                        requests.push({
                            url: url,
                            contentType: contentType,
                            status: response.status()
                        });
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
    });

    try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log(`Captured ${requests.length} relevant responses.`);
        fs.writeFileSync('te-network-log.json', JSON.stringify(requests, null, 2));

    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync('te-network-error.txt', error.toString());
    } finally {
        await browser.close();
    }
})();
