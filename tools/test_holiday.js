const fs = require('fs');

function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i], n = text[i + 1];
        if (c == '"') {
            if (inQuotes && n == '"') { field += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (c == ',' && !inQuotes) {
            row.push(field); field = '';
        } else if ((c == '\n' || c == '\r') && !inQuotes) {
            if (field !== '' || row.length) {
                row.push(field); rows.push(row);
                row = []; field = '';
            }
        } else { field += c; }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
}

function normalizeDate(s) {
    if (!s) return '';
    let v = ('' + s).trim();
    v = v.replace(/\//g, '-');
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (!isNaN(d)) {
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }
    return '';
}

async function test() {
    // 模擬 fetch holiday CSV
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://docs.google.com/spreadsheets/d/e/2PACX-1vQPWkSisyPrrYRbZirLg6Xc9v1Z7eQHeO-aBNYbopP2pfqj5PAkqhznaYnmJzQh2H1PRnL_-GeMThYT/pub?output=csv');
    // For node, we just use direct
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPWkSisyPrrYRbZirLg6Xc9v1Z7eQHeO-aBNYbopP2pfqj5PAkqhznaYnmJzQh2H1PRnL_-GeMThYT/pub?output=csv';
    const res = await fetch(url);
    const text = await res.text();

    const rows = parseCSV(text);
    const head = rows[0].map(x => x.trim().toLowerCase());
    const iDate = head.indexOf('date');
    const isHolidayIdx = head.indexOf('is_holiday');
    const set = new Set();

    console.log("iDate:", iDate, "isHolidayIdx:", isHolidayIdx);

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length <= iDate) continue;
        const iso = normalizeDate(r[iDate]);
        const isHol = isHolidayIdx >= 0 && r.length > isHolidayIdx ? r[isHolidayIdx].trim().toUpperCase() : 'TRUE';
        if (iso && isHol === 'TRUE') set.add(iso);
    }

    console.log("Holidays Set Size:", set.size);
    console.log("Has 2026-02-28?", set.has("2026-02-28"));

    const isoDate = "2026-03-01";
    const isoD = new Date(isoDate); // Node.js parses "2026-03-01" as UTC!
    console.log("isoD:", isoD.toISOString(), isoD.toString());

    const dMinus1 = new Date(isoD); dMinus1.setDate(isoD.getDate() - 1);

    const toIso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    console.log("dMinus1 string:", toIso(dMinus1));
    console.log("Has dMinus1?", set.has(toIso(dMinus1)));
}

test();
