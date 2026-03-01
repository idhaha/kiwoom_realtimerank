const fs = require('fs');
const path = 'd:/Program/Kiwoom/server.js';
let s = fs.readFileSync(path, 'utf8');

// The block we want to replace starts after 'page.evaluate(() => {' and ends before '} catch (e) {'
const startTag = 'const extractedData = await page.evaluate(() => {';
const endTag = '} catch (e) {';

// Find the first instance of 'try {' after our startTag
const startIndex = s.indexOf('try {', s.indexOf(startTag));
// Find the 'catch' block corresponding to the evaluate logic
const endIndex = s.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const head = s.substring(0, startIndex);
    const tail = s.substring(endIndex);
    const newContent = `try {
                        const chart = window.Highcharts && window.Highcharts.charts && window.Highcharts.charts[0];
                        if (!chart || !chart.series) return null;

                        // v20 Improved Series Selection: Merge all available series to get history + latest
                        const dataMap = new Map();
                        chart.series.forEach(s => {
                            if (!s.data || s.data.length === 0) return;
                            s.data.forEach(p => {
                                if (p.x !== undefined && p.y !== null && p.y !== undefined) {
                                    dataMap.set(p.x, p.y);
                                }
                            });
                        });

                        if (dataMap.size === 0) return null;
                        
                        return Array.from(dataMap.entries())
                            .sort((a, b) => a[0] - b[0])
                            .map(([x, y]) => ({
                                DateTime: new Date(x).toISOString(),
                                Value: y
                            }));
                    } `;
    fs.writeFileSync(path, head + newContent + tail);
    console.log('v20 Patch applied successfully!');
} else {
    console.log('Error: Could not find the code block in server.js');
    console.log('startIndex:', startIndex, 'endIndex:', endIndex);
}
