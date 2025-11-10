Dauntless Scheduler v2.6.1 — Cloud Edition

部署：
1) 將本資料夾整包放到你的 GitHub repo 根目錄並解壓。
2) 啟用 GitHub Pages → Deploy from branch → / (root)。
3) 開啟網址即可使用；手機可「加入主畫面」成為 PWA。

雲端設定（已寫入 index.html）：
- API_URL: https://script.google.com/macros/s/AKfycbzv4ot5A1WtjQhlngyY7A3oKQxo7Qz5JeOkM7Q8mXewcPFhPrgAyuuBzxsIlyRtKyTduw/exec
- SHEET_URL_SCHEDULE_CSV: https://docs.google.com/spreadsheets/d/e/2PACX-1vT-aNX0ZKFieLDhZpFlRuxioW_plgSinAG10yvaZYCGNzVIDcNTl22r-SYZ_zUuVfFxWWRUPV8USsF3/pub?output=csv
- SHEET_URL_HOLIDAY_CSV:  https://docs.google.com/spreadsheets/d/e/2PACX-1vQPWkSisyPrrYRbZirLg6Xc9v1Z7eQHeO-aBNYbopP2pfqj5PAkqhznaYnmJzQh2H1PRnL_-GeMThYT/pub?output=csv

寫入端（POST）：
- 前端直接 POST 到 API_URL，payload 為 JSON：
  { "date":"YYYY-MM-DD", "league":"海客", "status":"booked|avoid", "note":"備註" }
