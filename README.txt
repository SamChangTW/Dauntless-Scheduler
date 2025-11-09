Dauntless Scheduler v2.5 — FullCloud (Complete)
====================================================

這是完整可上線的 PWA 版本：
- 兩季（日）單頁總覽（僅列「星期日」）
- 已排 / 需避開 標示與統計
- 「🔴 查詢需避開（日）」→ 取自「需避開」 + 落在週日的行政院連假
- 「📝 建立／編輯賽程」→ 寫回 Google Sheets（若未設定 APPS_SCRIPT_URL 則寫 LocalStorage）
- 可安裝為 PWA，支援離線快取

使用方式：
1) 將整包上傳到 GitHub Pages（根目錄）
2) 編輯 js/cloud.js：
   - SCHEDULE_CSV：TSAA_Schedule_Core 的「發佈為 CSV」網址
   - HOLIDAY_CSV：Holiday_CoreFeed 的「發佈為 CSV」網址（可留空）
   - APPS_SCRIPT_URL：Apps Script Web App（Anyone）網址
3) 重新整理頁面（建議 Ctrl+F5）

Apps Script 參考：
------------------
const SHEET_ID = '你的試算表 ID';
const SHEET_NAME = 'Sheet1';
function doPost(e){
  try{
    const {date, league, status, note} = JSON.parse(e.postData.contents);
    const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sh.getDataRange().getDisplayValues();
    const h = data[0];
    const idx = (k)=> h.indexOf(k)+1 || h.indexOf(k==='date'?'日期':k)+1;
    const cD=idx('date'), cL=idx('league'), cS=idx('status'), cN=idx('note');
    let row=-1; for(let i=1;i<data.length;i++){ if(data[i][cD-1]===date){row=i+1;break;} }
    if(row>0){ sh.getRange(row,cL).setValue(league); sh.getRange(row,cS).setValue(status); sh.getRange(row,cN).setValue(note); }
    else{ sh.appendRow([date,league,status,note]); }
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}
