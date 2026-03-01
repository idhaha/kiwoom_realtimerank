const fs = require('fs');
const path = 'd:/Program/Kiwoom/server.js';
let s = fs.readFileSync(path, 'utf8');

// v27 Patch: Enhanced Dual-Stage Capture with Series Filtering
const extractLogic = `                const extractData = () => {
                    const dataMap = new Map();
                    if (!window.Highcharts || !window.Highcharts.charts) return null;
                    window.Highcharts.charts.forEach(chart => {
                        if (!chart || !chart.series) return;
                        chart.series.forEach(series => {
                            if (!series.data || series.data.length === 0) return;
                            
                            // Projection detection: horizontal lines at the end
                            // We ignore series that have exactly the same value for the last 5+ points of future-looking data
                            const points = series.data;
                            let isProjection = false;
                            if (points.length > 5) {
                                let sameValueCount = 0;
                                const lastVal = points[points.length-1].y || (Array.isArray(points[points.length-1]) ? points[points.length-1][1] : null);
                                for (let i = points.length - 2; i >= Math.max(0, points.length - 10); i--) {
                                    const val = points[i].y || (Array.isArray(points[i]) ? points[i][1] : null);
                                    if (val === lastVal) sameValueCount++;
                                    else break;
                                }
                                if (sameValueCount >= 5) isProjection = true;
                            }
                            if (isProjection && points.length < 50) return; // Skip small projection series

                            points.forEach(p => {
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

                // Stage 0: Extra wait for full chart initialization
                await new Promise(r => setTimeout(r, 4000));

                // Stage 1: Initial Capture (Daily data)
                let allPointsMap = new Map();
                const initialPoints = await page.evaluate(extractData);
                if (initialPoints) {
                    console.log(\`   📊 Stage 1 (Daily) captured \${initialPoints.length} points.\`);
                    initialPoints.forEach(p => allPointsMap.set(p.x, p.y));
                }

                // Click the appropriate duration button
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

                    if (targetButton !== '1Y') {
                        console.log(\`   🎯 Clicking \${targetButton} for historical data...\`);
                        const buttonResult = await page.evaluate((targetBtn) => {
                            const buttons = Array.from(document.querySelectorAll('button, a'));
                            const targetButton = buttons.find(btn => {
                                const text = btn.textContent.trim();
                                return text === targetBtn || text === targetBtn.toLowerCase() || text === targetBtn.replace('Y', ' Y');
                            });
                            if (targetButton) { targetButton.click(); return { success: true }; }
                            return { success: false };
                        }, targetButton);

                        if (buttonResult.success) {
                            await new Promise(r => setTimeout(r, 5000)); // Wait longer for reload
                            const postPoints = await page.evaluate(extractData);
                            if (postPoints) {
                                console.log(\`   📊 Stage 2 (Historical) captured \${postPoints.length} points.\`);
                                postPoints.forEach(p => {
                                    // Merge strategy: only overwrite if Stage 1 didn't have this point
                                    // Actually, for daily/weekly blend, we just keep all unique timestamps.
                                    if (!allPointsMap.has(p.x)) {
                                        allPointsMap.set(p.x, p.y);
                                    }
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('[Puppeteer] Navigation/Merge error:', e.message);
                }

                if (allPointsMap.size === 0) throw new Error('데이터 추출 실패');

                const finalData = Array.from(allPointsMap.entries())
                    .sort((a, b) => a[0] - b[0])
                    .map(([x, y]) => ({
                        DateTime: new Date(x).toISOString(),
                        Value: y
                    }));

                console.log(\`   ✅ Final Dataset: \${finalData.length} points (merged).\`);
                res.set('Cache-Control', 'public, max-age=300');
                return res.json({ success: true, data: finalData });`;

// Find where the TE page handling logic starts and ends
const startMarker = 'const extractData = () => {';
const endMarker = 'return res.json({ success: true, data: finalData });';

const lines = s.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(startMarker)) startIdx = i;
    if (lines[i].includes(endMarker)) endIdx = i;
}

if (startIdx !== -1 && endIdx !== -1) {
    const newLines = [
        ...lines.slice(0, startIdx),
        extractLogic,
        ...lines.slice(endIdx + 1)
    ];
    fs.writeFileSync(path, newLines.join('\n'));
    console.log('v27 Patch applied successfully at line ' + startIdx);
} else {
    console.log('Error: Could not find TE markers', startIdx, endIdx);
}
