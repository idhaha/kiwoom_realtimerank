const puppeteer = require('puppeteer');

async function debug() {
    console.log("Starting Deep Debug for USD/KRW...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    const url = 'https://tradingeconomics.com/south-korea/currency';
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));

    async function getSeriesInfo(label) {
        return await page.evaluate((lbl) => {
            if (!window.Highcharts || !window.Highcharts.charts) return { label: lbl, error: "No Highcharts" };
            return {
                label: lbl,
                charts: window.Highcharts.charts.map((c, ci) => ({
                    chartIndex: ci,
                    series: c.series.map((s, si) => ({
                        seriesIndex: si,
                        name: s.name,
                        dataLength: s.data.length,
                        visible: s.visible,
                        dashStyle: s.options.dashStyle,
                        color: s.color,
                        type: s.type
                    }))
                }))
            };
        }, label);
    }

    console.log("Captured (Default view):");
    console.log(JSON.stringify(await getSeriesInfo("Default"), null, 2));

    console.log("Clicking 5Y...");
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(el =>
            el.textContent.trim() === '5Y' || el.textContent.trim() === '5 Y'
        );
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 8000));
    console.log("Captured (5Y view):");
    console.log(JSON.stringify(await getSeriesInfo("5Y"), null, 2));

    await browser.close();
}

debug();
