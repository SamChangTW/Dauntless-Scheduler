const https = require('https');

async function testFetch() {
    console.log("Testing API_URL GET...");
    const apiUrl = "https://script.google.com/macros/s/AKfycbxPhQTE1FeeQSDQfaBSGv-M8S-DPavA0qpEZzVyVIxA-FHFcyPUV15eds4eBh616GDA3Q/exec";
    try {
        const res = await fetch(apiUrl + "?ping=1");
        console.log("API GET Status:", res.status);
        console.log("API GET Body:", await res.text());
    } catch(e) {
        console.error("API GET Error:", e.message);
    }
    
    console.log("\nTesting API_URL POST...");
    try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({action: 'ping'})
        });
        console.log("API POST Status:", res.status);
        console.log("API POST Body:", await res.text());
    } catch(e) {
        console.error("API POST Error:", e.message);
    }

    console.log("\nTesting CSV URL...");
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGNh5UyQtAbBRyMhD2qBBToQ68wH2J2_R9Yd-n97fTHv6LgWZZp_XRUEQ_9-j7opRu4pzSRWnZ-Sxs/pub?output=csv";
    try {
        const res = await fetch(csvUrl);
        console.log("CSV Status:", res.status);
        const text = await res.text();
        console.log("CSV Body Start:", text.substring(0, 100));
    } catch(e) {
        console.error("CSV Error:", e.message);
    }
}

testFetch();
