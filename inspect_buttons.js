const puppeteer = require('puppeteer');

async function inspectButtons() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const url = 'https://tradingeconomics.com/south-korea/currency';
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));

    const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a')).map(el => ({
            text: el.textContent.trim(),
            tagName: el.tagName,
            className: el.className
        })).filter(b => b.text.length > 0 && b.text.length < 10);
    });

    console.log("Found buttons:", JSON.stringify(buttons, null, 2));

    await browser.close();
}

inspectButtons();
