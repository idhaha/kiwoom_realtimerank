const fs = require('fs');
const path = 'd:/Program/Kiwoom/server.js';
let s = fs.readFileSync(path, 'utf8');

// v22 Update: Robust Highcharts extraction (handle arrays) and stability
const oldBlock = `                        // v20 Improved Series Selection: Merge all available series to get history + latest
                        const dataMap = new Map();
                        chart.series.forEach(s => {
                            if (!s.data || s.data.length === 0) return;
                            s.data.forEach(p => {
                                if (p.x !== undefined && p.y !== null && p.y !== undefined) {
                                    dataMap.set(p.x, p.y);
                                }
                            });
                        });`;

const newBlock = `                        // v22 Improved Extraction: Handle both {x,y} and [x,y] formats
                        const dataMap = new Map();
                        chart.series.forEach(s => {
                            if (!s.data || s.data.length === 0) return;
                            s.data.forEach(p => {
                                let x, y;
                                if (Array.isArray(p)) {
                                    x = p[0]; y = p[1];
                                } else if (p && typeof p === 'object') {
                                    x = p.x; y = p.y;
                                }
                                if (x !== undefined && y !== null && y !== undefined) {
                                    dataMap.set(x, y);
                                }
                            });
                        });`;

if (s.includes(oldBlock)) {
    s = s.replace(oldBlock, newBlock);

    // Also improve stability: change domcontentloaded to networkidle2 and add retry for detached frame
    s = s.replace(`await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });`,
        `// v22: Improved stability with retries and networkidle2
                let retryCount = 0;
                while (retryCount < 2) {
                    try {
                        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
                        break; 
                    } catch (e) {
                        if (e.message.includes('detached') || e.message.includes('navigation')) {
                            retryCount++;
                            await new Promise(r => setTimeout(r, 2000));
                        } else throw e;
                    }
                }
                await new Promise(r => setTimeout(r, 2000));`);

    fs.writeFileSync(path, s);
    console.log('v22 Patch applied successfully!');
} else {
    // If exact match fails, let's try a simpler regex or check what's there
    console.log('Error: Could not find the exactly matching v20 block in server.js');
    console.log('Current content snippet near line 660:');
    const lines = s.split('\n');
    console.log(lines.slice(655, 675).join('\n'));
}
