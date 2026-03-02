const puppeteer = require('puppeteer');

async function debugUSDKRW() {
    console.log("Starting USD/KRW 5Y Debug...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    const url = 'https://tradingeconomics.com/south-korea/currency';
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Try to click 5Y
    console.log("Attempting to click 5Y...");
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(el =>
            el.textContent.trim() === '5Y' || el.textContent.trim() === '5 Y'
        );
        if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const info = await page.evaluate(() => {
        if (!window.Highcharts) return "No Highcharts";
        return window.Highcharts.charts.map((c, i) => ({
            index: i,
            seriesCount: c.series.length,
            seriesInfo: c.series.map(s => ({
                name: s.name,
                visible: s.visible,
                dataLength: s.data.length,
                dashStyle: s.options.dashStyle,
                isProjection: (s.name && s.name.toLowerCase().includes('projection')) ||
                    (s.options.dashStyle && s.options.dashStyle !== 'Solid')
            }))
        }));
    });

    console.log("Highcharts Info:", JSON.stringify(info, null, 2));

    await browser.close();
}

debugUSDKRW();
