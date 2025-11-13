# Dauntless Scheduler v2.7.4 — CloudLink Diagnose
- `/web`：單頁 App（含建立賽程、需避開週日、已安排賽程、🧪自動驗證）
- `/tools/CloudLink_Test.http`：IntelliJ HTTP Client 測 API
- `/gas/Dauntless_Scheduler_API_v2_7_4.gs`：貼到 Apps Script，部署為 Web App
- `/diagnose/CloudLink_Diagnose.py`：可選 CLI 測試

## 使用步驟
1. 在 `/web/config.js` 填入三個連結（兩個 CSV、一個 /exec）
2. Apps Script：把 `SHEET_ID` 換成你的 → 新部署 → 網路應用程式（任何人）
3. IntelliJ：右鍵開啟 `/web/index.html` → 🧪 自動驗證三項通過後即可使用
