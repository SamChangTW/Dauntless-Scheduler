
/**
 * Dauntless Scheduler v2.7.4 - Configuration
 * CloudLink Diagnose Edition
 */

const CONFIG = {
    // 版本號
    VERSION: "2.7.6-CloudLinkDiagnose",

    // Schedule CSV URL
    // 賽程資料表 (公開發布的 CSV)
    SHEET_URL_SCHEDULE_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQGNh5UyQtAbBRyMhD2qBBToQ68wH2J2_R9Yd-n97fTHv6LgWZZp_XRUEQ_9-j7opRu4pzSRWnZ-Sxs/pub?output=csv",

    // Holiday CSV URL
    // 假期資料表 (公開發布的 CSV - 舊版備用)
    SHEET_URL_HOLIDAY_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQPWkSisyPrrYRbZirLg6Xc9v1Z7eQHeO-aBNYbopP2pfqj5PAkqhznaYnmJzQh2H1PRnL_-GeMThYT/pub?output=csv",

    // Auto-Updating JSON API URL
    // 台灣開源社群維護的行政院休假日曆 JSON API (新版主用)
    JSON_HOLIDAY_API: "https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/",

    // Apps Script Web App URL
    // 部署的 API 端點 (用於寫入資料)
    API_URL: "https://script.google.com/macros/s/AKfycbx-Swaae1ViPD3S-EHM9uNKj3KOfwsnmw42JuE098aqC3XilElUihT7NtNnFeAxe0ksPw/exec",

    // API Token - 寫入端點的簡易驗證令牌
    // 必須與 GAS Script Properties 中的 API_TOKEN 設定值一致
    // 請至 GAS 編輯器 → 專案設定 → 指令碼屬性，新增 API_TOKEN = 你的密鑰
    API_TOKEN: "ds_token_changeme_27x4"
};