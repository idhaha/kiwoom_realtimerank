
const testUrls = [
    "fred(DGS10)",
    "fred('DGS10')",
    "fred(\"DGS10\")",
    "fred(DGS10, 1y)",
    "fred('DGS10', '6m')",
    "fred ( DGS10 , 2y ) "
];

testUrls.forEach(url => {
    const fredMatch = url.match(/fred\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/i);
    if (fredMatch) {
        const cleanArg = (s) => s ? s.replace(/['"]/g, '').trim() : '';
        const sid = cleanArg(fredMatch[1]);
        const per = cleanArg(fredMatch[2]) || '1년';
        console.log(`PASS: ${url} -> SID: ${sid}, PER: ${per}`);
    } else {
        console.log(`FAIL: ${url}`);
    }
});
