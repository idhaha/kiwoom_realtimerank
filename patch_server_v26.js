const fs = require('fs');
const path = 'd:/Program/Kiwoom/server.js';
let s = fs.readFileSync(path, 'utf8');

const extractLogic = `                const extractData = () => {
                    const dataMap = new Map();
                    if (!window.Highcharts || !window.Highcharts.charts) return null;
                    window.Highcharts.charts.forEach(chart => {
                        if (!chart || !chart.series) return;
                        chart.series.forEach(s => {
                            if (!s.data || s.data.length === 0) return;
                            s.data.forEach(p => {
                                let x, y;
                                if (Array.isArray(p)) { x = p[0]; y = p[1]; }
                                else if (p && typeof p === 'object') { x = p.x; y = p.y; }
                                if (x !== undefined && y !== null && y !== undefined) {
                                    dataMap.set(x, y);
                                }
                            });
                        });
                    });
                    return Array.from(dataMap.entries()).map(([x, y]) => ({ x, y }));
                };

                // Stage 1: Initial Capture (usually contains recent daily data)
                let allPointsMap = new Map();
                const initialPoints = await page.evaluate(extractData);
                if (initialPoints) initialPoints.forEach(p => allPointsMap.set(p.x, p.y));

                // Click the appropriate duration button based on user request
                try {
                    let targetButton = '5Y';
                    if (duration) {
                        const yearsMatch = duration.match(/(\\d+)\\s*년/);
                        if (yearsMatch) {
                            const years = parseInt(yearsMatch[1]);
                            if (years >= 10) targetButton = '10Y';
                            else if (years >= 5) targetButton = '5Y';
                            else if (years >= 1) targetButton = '1Y';
                        } else if (duration.toLowerCase().includes('max') || duration.toLowerCase().includes('전체')) {
                            targetButton = 'MAX';
                        }
                    }

                    const buttonResult = await page.evaluate((targetBtn) => {
                        const buttons = Array.from(document.querySelectorAll('button, a'));
                        const targetButton = buttons.find(btn => {
                            const text = btn.textContent.trim();
                            return text === targetBtn || text === targetBtn.toLowerCase() || text === targetBtn.replace('Y', ' Y');
                        });
                        if (targetButton) { targetButton.click(); return { success: true }; }
                        const chart = window.Highcharts && window.Highcharts.charts ? window.Highcharts.charts[0] : null;
                        if (chart && chart.rangeSelector && chart.rangeSelector.buttons) {
                            for (let i = 0; i < chart.rangeSelector.buttons.length; i++) {
                                const btn = chart.rangeSelector.buttons[i];
                                if (btn.text === targetBtn || btn.text === targetBtn.toLowerCase()) {
                                    chart.rangeSelector.clickButton(i); return { success: true };
                                }
                            }
                        }
                        return { success: false };
                    }, targetButton);

                    if (buttonResult.success) {
                        await new Promise(r => setTimeout(r, 3000));
                        // Stage 2: Post-Click Capture (contains historical data)
                        const postPoints = await page.evaluate(extractData);
                        if (postPoints) postPoints.forEach(p => allPointsMap.set(p.x, p.y));
                    }
                } catch (e) {
                    console.error('[Puppeteer] Click/Extract error:', e.message);
                }

                if (allPointsMap.size === 0) throw new Error('데이터 추출 실패 (Highcharts not found or empty)');

                const finalData = Array.from(allPointsMap.entries())
                    .sort((a, b) => a[0] - b[0])
                    .map(([x, y]) => ({
                        DateTime: new Date(x).toISOString(),
                        Value: y
                    }));

                console.log(\`   ✅ Extracted \${finalData.length} points via Dual-Stage Puppeteer.\`);
                res.set('Cache-Control', 'public, max-age=300');
                return res.json({ success: true, data: finalData });`;

// Find where the TE page handling logic starts and ends
const startMarker = 'await page.waitForFunction(() => {';
const endMarker = 'throw new Error("Puppeteer failed to extract data from Highcharts.");';

const lines = s.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(startMarker)) {
        // Ensure it's inside the TE handler (look for proximity to targetUrl)
        if (s.indexOf('targetUrl', Math.max(0, s.lastIndexOf('app.js', i))) !== -1) {
            startIdx = i;
        }
    }
    if (lines[i].includes(endMarker)) endIdx = i;
}

if (startIdx !== -1 && endIdx !== -1) {
    // We want to replace everything from startIdx to endIdx + something
    // Let's include the following '}' as well.
    let realEnd = endIdx;
    if (lines[endIdx + 1].trim() === '}') realEnd = endIdx + 1;

    const newLines = [
        ...lines.slice(0, startIdx),
        extractLogic,
        ...lines.slice(realEnd + 1)
    ];
    fs.writeFileSync(path, newLines.join('\n'));
    console.log('v26 Patch applied successfully at line ' + startIdx);
} else {
    console.log('Error: Could not find TE markers', startIdx, endIdx);
}
