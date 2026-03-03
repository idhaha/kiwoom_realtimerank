function splitByCommaIgnoringQuotes(str) {
    const parts = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let parenDepth = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (inQuote) {
            current += char;
            if (char === quoteChar) inQuote = false;
        } else {
            if (char === '"' || char === "'" || char === '“' || char === '”') {
                inQuote = true;
                quoteChar = char;
                current += char;
            } else if (char === '(') {
                parenDepth++;
                current += char;
            } else if (char === ')') {
                if (parenDepth > 0) parenDepth--;
                current += char;
            } else if (char === ',' && parenDepth === 0) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
    }
    if (current) parts.push(current.trim());
    return parts;
}

function simulateParse(configLine) {
    console.log(`\n--- Simulating Parse: ${configLine} ---`);
    const contentMatch = configLine.match(/\((.*)\)/);
    if (!contentMatch) { console.log("❌ No parentheses match"); return; }

    const rawParts = splitByCommaIgnoringQuotes(contentMatch[1]);
    const parts = rawParts.map(s => s.trim().replace(/^[ "'“‘”’]+|[ "'“‘”’]+$/g, ''));
    console.log("Split parts:", parts);

    let series = [];
    if (parts.length >= 2 && parts.length % 2 === 0) {
        for (let i = 0; i < parts.length; i += 2) {
            series.push({ url: parts[i], label: parts[i + 1] });
        }
    }
    console.log("Generated seriesConfig:", JSON.stringify(series, null, 2));

    series.forEach(item => {
        const url = item.url;
        const lowerUrl = url.toLowerCase().trim();
        let dataSource = '';
        if (lowerUrl.indexOf('fred') !== -1) dataSource = 'fred';
        else if (lowerUrl.indexOf('ecos') !== -1) dataSource = 'ecos';
        else if (lowerUrl.indexOf('tradingeconomics.com') !== -1 || lowerUrl.indexOf('tradingeconomics') !== -1) dataSource = 'te';

        console.log(`URL: ${url} -> Source: ${dataSource}`);

        if (dataSource === 'fred') {
            const fredMatch = url.match(/fred\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/i);
            if (fredMatch) {
                const cleanArg = (s) => s ? s.replace(/['"“”‘’]/g, '').trim() : '';
                const sid = cleanArg(fredMatch[1]);
                const per = cleanArg(fredMatch[2]) || '1년';
                console.log(`  FRED Match! SID: ${sid}, Period: ${per}`);
            } else {
                console.log("  ❌ FRED regex failed");
            }
        } else if (dataSource === 'ecos') {
            const innerResult = url.match(/ecos\s*\(([^)]+)\)/i);
            if (innerResult) {
                const args = innerResult[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
                console.log(`  ECOS Match! Args:`, args);
            } else {
                console.log("  ❌ ECOS regex failed");
            }
        }
    });
}

// User's exact config strings
simulateParse(`("fred('DGS10','10년')","미국채 10년물","fred('DGS2','10년')","2년물")`);
simulateParse(`("ecos('010210000','10년')","한국채 10년물","ecos('010195000','10년')","2년물")`);
