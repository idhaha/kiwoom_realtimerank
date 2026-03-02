const puppeteer = require('puppeteer');

async function compareCharts() {
    const browser = await puppeteer.launch({ headless: "new" });
    const urls = [
        'https://tradingeconomics.com/south-korea/currency',
        'https://tradingeconomics.com/japan/currency'
    ];

    for (const url of urls) {
        console.log(`\n--- Inspecting: ${url} ---`);
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000));

        const data = await page.evaluate(() => {
            const result = {
                highcharts: !!window.Highcharts,
                chartContainers: Array.from(document.querySelectorAll('[id^="chart"], .chart, #container')).map(el => ({
                    id: el.id,
                    className: el.className,
                    innerText: el.innerText.substring(0, 50)
                })),
                scripts: Array.from(document.querySelectorAll('script')).map(s => s.src).filter(src => src.includes('highcharts') || src.includes('te-chart'))
            };
            return result;
        });
        console.log(JSON.stringify(data, null, 2));
        await page.close();
    }
    await browser.close();
}

compareCharts();
