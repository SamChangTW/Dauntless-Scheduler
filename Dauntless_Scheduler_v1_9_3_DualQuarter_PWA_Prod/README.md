# Dauntless Scheduler v1.9.3 — Dual Quarter (PWA)

單頁／行動優先的 TSAA 無畏者賽程排程器：僅顯示週日、雙季度視圖、行政院假期自動避開、離線可用。

## 功能
- 連續 **兩季（6 個月）週日清單**
- 標記狀態：可排 / 已排 / 避開 / 未設定
- 行政院核定連假自動避開（不覆蓋「已排」）
- 彈出「本雙季避開清單」
- 讀寫 Excel（前端完成）：匯出 Avoid_Sundays / Scheduler_Log / Core_Schedule
- PWA：可安裝到主畫面、離線使用

## 連入檔案（各選一次）
- `Shared_Data/Holiday/Holiday_CoreFeed.xlsx`
- `CoreControl/TSAA_Schedule_Core_v1.4.3.xlsx`
- `Reports/Scheduler_Log_v1.4.3.xlsx`（可略）

## GitHub Pages 部署
1. 新建 public repo（例如 `Dauntless-Scheduler`）。
2. 上傳本資料夾所有內容（不是 zip）。
3. Settings → Pages → Deploy from branch → `main` / root。
4. 開啟網址 `https://<你的帳號>.github.io/Dauntless-Scheduler/`。
5. 手機開啟 → 「加到主畫面」。

## 路徑與資料結構（雲端）
```
TSAA_Dauntless_Master/
├─ CoreControl/TSAA_Schedule_Core_v1.4.3.xlsx
├─ Shared_Data/Holiday/Holiday_CoreFeed.xlsx
├─ Reports/Scheduler_Log_v1.4.3.xlsx
└─ Logs/
```

---
Design: Sam Chang × C⁵