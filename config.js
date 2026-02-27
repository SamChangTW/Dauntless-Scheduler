
/**
 * Dauntless Scheduler v2.7.4 - Configuration
 * CloudLink Diagnose Edition
 */

const CONFIG = {
    // 版本號
    VERSION: "2.7.4-CloudLinkDiagnose",

    // Schedule CSV URL
    // 賽程資料表 (公開發布的 CSV)
    SHEET_URL_SCHEDULE_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGNh5UyQtAbBRyMhD2qBBToQ68wH2J2_R9Yd-n97fTHv6LgWZZp_XRUEQ_9-j7opRu4pzSRWnZ-Sxs/pub?output=csv",

    // Holiday CSV URL
    // 假期資料表 (公開發布的 CSV - 舊版備用)
    SHEET_URL_HOLIDAY_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQPWkSisyPrrYRbZirLg6Xc9v1Z7eQHeO-aBNYbopP2pfqj5PAkqhznaYnmJzQh2H1PRnL_-GeMThYT/pub?output=csv",

    // Auto-Updating JSON API URL
    // 台灣開源開源社群維護的行政院休假日曆 JSON API (新版主用)
    JSON_HOLIDAY_API: "https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/",

    // Apps Script Web App URL
    // 部署的 API 端點 (用於寫入資料)
    API_URL: "https://script.google.com/macros/s/AKfycbxPhQTE1FeeQSDQfaBSGv-M8S-DPavA0qpEZzVyVIxA-FHFcyPUV15eds4eBh616GDA3Q/exec"
};