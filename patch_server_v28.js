const fs = require('fs');
const path = 'd:/Program/Kiwoom/server.js';
let s = fs.readFileSync(path, 'utf8');

// v28 Patch: Force Daily resolution and improved stability
const teHandler = `                // v28: Robust resolution and stability fix
                // 1. Initial Load
                let retryCount = 0;
                while (retryCount < 2) {
                    try {
                        await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 });
                        break;
                    } catch (e) {
                        retryCount++;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
                
                // 2. Clear distractions and wait for Highcharts
                await page.evaluate(() => {
                    const ads = document.querySelectorAll('.adv, iframe, .teaser-column');
                    ads.forEach(a => a.remove());
                });
                
                await page.waitForFunction(() => {
                    return window.Highcharts && window.Highcharts.charts && window.Highcharts.charts.length > 0;
                }, { timeout: 30000 }).catch(() => {});

                const extractPoints = () => {
                    const map = new Map();
                    if (!window.Highcharts || !window.Highcharts.charts) return null;
                    window.Highcharts.charts.forEach(chart => {
                        if (!chart || !chart.series) return;
                        chart.series.forEach(series => {
                            if (!series.data || series.data.length === 0) return;
                            
                            // Projection detection (horizontal lines at the end)
                            const data = series.data;
                            if (data.length > 10) {
                                let sameValCount = 0;
                                const lastVal = data[data.length-1].y !== undefined ? data[data.length-1].y : (Array.isArray(data[data.length-1]) ? data[data.length-1][1] : null);
                                for (let i = data.length - 2; i >= data.length - 6; i--) {
                                    const val = data[i].y !== undefined ? data[i].y : (Array.isArray(data[i]) ? data[i][1] : null);
                                    if (val === lastVal) sameValCount++;
                                }
                                if (sameValCount >= 4 && data.length < 50) return; // Skip projection-only series
                            }

                            data.forEach(p => {
                                let x, y;
                                if (Array.isArray(p)) { x = p[0]; y = p[1]; }
                                else if (p && typeof p === 'object') { x = p.x; y = p.y; }
                                if (x !== undefined && y !== null && y !== undefined) {
                                    map.set(x, y);
                                }
                            });
                        });
                    });
                    return Array.from(map.entries()).map(([x, y]) => ({ x, y }));
                };

                let masterMap = new Map();

                // 3. Force Daily mode to get Feb 27 (usually '1Y' button provides daily)
                console.log('   📡 Capturing latest daily data...');
                const click1Y = await page.evaluate(() => {
                    const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.trim() === '1Y');
                    if (btn) { btn.click(); return true; }
                    return false;
                });
                if (click1Y) await new Promise(r => setTimeout(r, 3000));
                
                const dailyPoints = await page.evaluate(extractPoints);
                if (dailyPoints) dailyPoints.forEach(p => masterMap.set(p.x, p.y));

                // 4. Get requested duration (e.g. 10Y) for historical data
                if (duration && !duration.includes('1년')) {
                    let targetBtn = '5Y';
                    const yMatch = duration.match(/(\\d+)\\s*년/);
                    if (yMatch) {
                        const count = parseInt(yMatch[1]);
                        if (count >= 10) targetBtn = '10Y';
                        else if (count >= 5) targetBtn = '5Y';
                    } else if (duration.toLowerCase().includes('max') || duration.toLowerCase().includes('전체')) {
                        targetBtn = 'MAX';
                    }

                    console.log(\`   🎯 Clicking \${targetBtn} for historical data...\`);
                    const clickTarget = await page.evaluate((t) => {
                        const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.trim() === t || el.textContent.trim() === t.replace('Y', ' Y'));
                        if (btn) { btn.click(); return true; }
                        return false;
                    }, targetBtn);
                    
                    if (clickTarget) {
                        await new Promise(r => setTimeout(r, 4000));
                        const histPoints = await page.evaluate(extractPoints);
                        if (histPoints) {
                            histPoints.forEach(p => {
                                if (!masterMap.has(p.x)) masterMap.set(p.x, p.y);
                            });
                        }
                    }
                }

                if (masterMap.size === 0) throw new Error('데이터 획득 실패 (Highcharts empty)');

                const finalData = Array.from(masterMap.entries())
                    .sort((a, b) => a[0] - b[0])
                    .map(([x, y]) => ({
                        DateTime: new Date(x).toISOString(),
                        Value: y
                    }));

                console.log(\`   ✅ Success: Merged \${finalData.length} points.\`);
                res.set('Cache-Control', 'public, max-age=300');
                return res.json({ success: true, data: finalData });`;

// Find the start and end of the TE block
const p1 = 'if (targetUrl.includes(\'tradingeconomics.com\')) {';
const p2 = 'const fetchWithHeaders = async (url) => {';

const startIdx = s.indexOf(p1);
const endIdx = s.indexOf(p2, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    // We want to keep from p1 to the point where browsers/pages are defined, then replace the logic
    // Actually, let's replace from after "const page = await browser.newPage();" up to before "finally"
    const subStart = s.indexOf('const page = await browser.newPage();', startIdx) + 'const page = await browser.newPage();'.length;
    const subEnd = s.lastIndexOf('} catch (e) {', endIdx);

    if (subStart !== -1 && subEnd !== -1) {
        const newCode = s.substring(0, subStart) + '\n' + teHandler + '\n                ' + s.substring(subEnd);
        fs.writeFileSync(path, newCode);
        console.log('v28 Patch applied successfully!');
    } else {
        console.log('Sub-markers not found', subStart, subEnd);
    }
} else {
    console.log('TE markers not found', startIdx, endIdx);
}
