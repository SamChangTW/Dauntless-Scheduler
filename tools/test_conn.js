/**
 * Dauntless Scheduler v2.7.4 — 連線診斷工具
 *
 * 用途：在 Node.js 環境直接測試 GAS API 與 CSV 連線是否正常。
 *
 * ⚠️  注意：以下 URL 與 TOKEN 需與 web/config.js 保持一致。
 *     若 config.js 有異動，請同步更新此檔案的對應常數。
 *
 * 執行方式：
 *   node tools/test_conn.js
 */

const API_URL = "https://script.google.com/macros/s/AKfycbxPhQTE1FeeQSDQfaBSGv-M8S-DPavA0qpEZzVyVIxA-FHFcyPUV15eds4eBh616GDA3Q/exec";
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGNh5UyQtAbBRyMhD2qBBToQ68wH2J2_R9Yd-n97fTHv6LgWZZp_XRUEQ_9-j7opRu4pzSRWnZ-Sxs/pub?output=csv";
// ⬇ 請與 config.js 的 API_TOKEN 保持一致
const API_TOKEN = "ds_token_changeme_27x4";

async function testFetch() {
    console.log("=== Dauntless Scheduler v2.7.4 — 連線診斷 ===\n");

    // 1. GET ping
    console.log("1. 測試 API_URL GET (ping)...");
    try {
        const res = await fetch(API_URL + "?ping=1");
        console.log("   狀態碼:", res.status);
        console.log("   回傳內容:", await res.text());
    } catch (e) {
        console.error("   ❌ 錯誤:", e.message);
    }

    // 2. POST ping（含 Token）
    console.log("\n2. 測試 API_URL POST (帶 Token)...");
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'ping', token: API_TOKEN })
        });
        console.log("   狀態碼:", res.status);
        console.log("   回傳內容:", await res.text());
    } catch (e) {
        console.error("   ❌ 錯誤:", e.message);
    }

    // 3. POST ping（不帶 Token，預期被拒絕）
    console.log("\n3. 測試 API_URL POST (不帶 Token，預期回傳 Unauthorized)...");
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addSchedule' }) // 刻意不帶 token
        });
        console.log("   狀態碼:", res.status);
        console.log("   回傳內容:", await res.text());
    } catch (e) {
        console.error("   ❌ 錯誤:", e.message);
    }

    // 4. CSV 讀取
    console.log("\n4. 測試 CSV URL...");
    try {
        const res = await fetch(CSV_URL);
        console.log("   狀態碼:", res.status);
        const text = await res.text();
        console.log("   前 100 字元:", text.substring(0, 100));
    } catch (e) {
        console.error("   ❌ 錯誤:", e.message);
    }

    console.log("\n=== 診斷完成 ===");
}

testFetch();
