const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const url = 'https://tradingeconomics.com/south-korea/currency';

    try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Page loaded. Checking Highcharts...');
        const chartInfo = await page.evaluate(() => {
            if (!window.Highcharts || !window.Highcharts.charts || window.Highcharts.charts.length === 0) {
                return { error: 'Highcharts not found' };
            }

            const chart = window.Highcharts.charts[0];
            const seriesInfo = chart.series.map((s, idx) => ({
                index: idx,
                name: s.name,
                dataLength: s.data.length,
                firstPoint: s.data.length > 0 ? { x: s.data[0].x, y: s.data[0].y } : null,
                visible: s.visible
            }));

            // Check buttons
            const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.textContent.trim()).filter(t => ['1Y', '5Y', '10Y', 'MAX'].includes(t));

            // Check rangeSelector
            let rangeSelectorButtons = [];
            if (chart.rangeSelector && chart.rangeSelector.buttons) {
                rangeSelectorButtons = chart.rangeSelector.buttons.map(b => b.text);
            }

            return {
                series: seriesInfo,
                buttons: buttons,
                rangeSelectorButtons: rangeSelectorButtons
            };
        });

        console.log('Chart Info:', JSON.stringify(chartInfo, null, 2));
        fs.writeFileSync('te-currency-result.json', JSON.stringify(chartInfo, null, 2));

    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync('te-currency-error.txt', error.toString());
    } finally {
        await browser.close();
    }
})();
