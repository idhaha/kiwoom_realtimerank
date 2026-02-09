const input = `("ecos('010195000','1년'),"한국채 2년물","ecos('010210000','1년'),"한국채 10년물")`;

function splitByCommaIgnoringQuotes(str) {
    const parts = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

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
            } else if (char === ',') {
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

const contentMatch = input.match(/\((.*)\)/);
if (contentMatch) {
    const rawParts = splitByCommaIgnoringQuotes(contentMatch[1]);
    console.log("Raw Parts:", rawParts);

    const parts = rawParts.map(s => {
        return s.trim().replace(/^[ "'“‘”’]+|[ "'“‘”’]+$/g, '');
    });
    console.log("Cleaned Parts:", parts);
} else {
    console.log("No match");
}
