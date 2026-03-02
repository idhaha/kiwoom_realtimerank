const puppeteer = require('puppeteer');

async function testStage1() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const url = 'https://tradingeconomics.com/south-korea/currency';
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log("Clicking 5Y...");
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(el =>
            el.textContent.trim() === '5Y' || el.textContent.trim() === '5 Y'
        );
        if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 8000));

    const data = await page.evaluate(() => {
        const extractPoints = () => {
            const map = new Map();
            if (!window.Highcharts || !window.Highcharts.charts) return [];
            const tomorrow = Date.now() + 3600000;
            window.Highcharts.charts.forEach(chart => {
                if (!chart.series) return;
                chart.series.forEach(series => {
                    const isProjection = (series.name && series.name.toLowerCase().includes('projection')) ||
                        (series.options.dashStyle && series.options.dashStyle !== 'Solid');
                    if (isProjection) return;
                    if (!series.data) return;
                    series.data.forEach(p => {
                        let x, y;
                        if (Array.isArray(p)) { x = p[0]; y = p[1]; }
                        else if (p && typeof p === 'object') { x = p.x; y = p.y; }
                        if (x !== undefined && y !== null && y !== undefined) {
                            if (x > tomorrow) return;
                            map.set(x, y);
                        }
                    });
                });
            });
            return Array.from(map.entries()).map(([x, y]) => ({ x, y }));
        };
        return {
            points: extractPoints(),
            chartCount: window.Highcharts ? window.Highcharts.charts.length : 0
        };
    });

    console.log(`Captured points: ${data.points.length}`);
    console.log(`Chart count: ${data.chartCount}`);
    if (data.points.length > 0) {
        console.log(`Last point: ${new Date(data.points[data.points.length - 1].x).toISOString()}`);
        console.log(`First point: ${new Date(data.points[0].x).toISOString()}`);
    }

    await browser.close();
}

testStage1();
