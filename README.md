# Dauntless Scheduler v2.3 — CloudLink (PWA)

- 雙季（日）一頁總覽
- 讀取：Google Sheets（公開 CSV）或 LocalStorage
- 寫入：Google Apps Script Web App（POST）或 LocalStorage 測試

## 設定
修改 `app.js` 頂端 CONFIG：
- `SHEET_URL_SCHEDULE_CSV`：TSAA_Schedule_Core 轉為 Google Sheets 後 *Publish to web (CSV)* 的 URL
- `SHEET_URL_HOLIDAY_CSV`：Holiday_CoreFeed 同上（可留空）
- `API_URL`：Apps Script Web App 發布 URL（Anyone）

### Apps Script 範例（覆蓋同日或新增）
```javascript
const SHEET_ID = '你的表 ID';
const SHEET_NAME = 'Sheet1';
function doPost(e){
  const body = JSON.parse(e.postData.contents);
  const {date, league, status, note} = body;
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sh.getDataRange().getDisplayValues();
  const h = data[0];
  const idx = (k)=> h.indexOf(k)+1 || h.indexOf(k==='date'?'日期':k)+1;
  const cD=idx('date'), cL=idx('league'), cS=idx('status'), cN=idx('note');
  let row=-1; for(let i=1;i<data.length;i++){ if(data[i][cD-1]===date){row=i+1;break;} }
  if(row>0){ sh.getRange(row,cL).setValue(league); sh.getRange(row,cS).setValue(status); sh.getRange(row,cN).setValue(note); }
  else{ sh.appendRow([date,league,status,note]); }
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
}
```
