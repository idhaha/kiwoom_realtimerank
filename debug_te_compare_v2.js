const puppeteer = require('puppeteer');

async function compare() {
    const browser = await puppeteer.launch({ headless: "new" });
    const urls = [
        { label: "USD_KRW", url: 'https://tradingeconomics.com/south-korea/currency' },
        { label: "USD_JPY", url: 'https://tradingeconomics.com/japan/currency' }
    ];

    for (const item of urls) {
        console.log(`\n--- Debugging: ${item.label} ---`);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        await page.goto(item.url, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 6000));

        // Click 5Y
        console.log("Clicking 5Y...");
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button, a')).find(el =>
                el.textContent.trim() === '5Y' || el.textContent.trim() === '5 Y'
            );
            if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 8000));

        const data = await page.evaluate(() => {
            if (!window.Highcharts || !window.Highcharts.charts) return "No Highcharts";
            return window.Highcharts.charts.map((c, ci) => ({
                chartIndex: ci,
                series: c.series.map(s => ({
                    name: s.name,
                    dataLength: s.data.length,
                    first: s.data[0] ? new Date(s.data[0].x || s.data[0][0]).toISOString() : null,
                    last: s.data[s.data.length - 1] ? new Date(s.data[s.data.length - 1].x || s.data[s.data.length - 1][0]).toISOString() : null
                }))
            }));
        });
        console.log(JSON.stringify(data, null, 2));
        await page.close();
    }
    await browser.close();
}

compare();
