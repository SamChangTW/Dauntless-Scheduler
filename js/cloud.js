// === CloudLink 設定 ===
// 將下列三個網址換成你的 Google Sheets「發佈為 CSV」與 Apps Script Web App（exec）
// 若留空，系統會自動使用本機 LocalStorage 測試模式
const CLOUD = {
  SHEET_URL_SCHEDULE_CSV: https://docs.google.com/spreadsheets/d/e/2PACX-1vT-aNX0ZKFieLDhZpFlRuxioW_plgSinAG10yvaZYCGNzVIDcNTl22r-SYZ_zUuVfFxWWRUPV8USsF3/pub?output=csv
  SHEET_URL_HOLIDAY_CSV: https://docs.google.com/spreadsheets/d/e/2PACX-1vQPWkSisyPrrYRbZirLg6Xc9v1Z7eQHeO-aBNYbopP2pfqj5PAkqhznaYnmJzQh2H1PRnL_-GeMThYT/pub?output=csv
  API_URL: https://script.google.com/macros/s/AKfycby_Lf_4lBkfGkEDj6G0lOom3mIPLSlOy_jo5majgoYPrNXIXrutpmHVQ_hQq9oJkMrU/exec
  COLS: { date:["date","日期"], league:["league","聯盟"], status:["status","狀態"], note:["note","備註"] }
};

async function fetchCSV(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error("CSV 讀取失敗");
  const text = await res.text();
  const rows = text.trim().split(/\r?\n/).map(r => r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/));
  const header = rows.shift().map(h => h.trim().toLowerCase());
  const idx = (keys) => { for(const k of keys){ const i=header.indexOf(k.toLowerCase()); if(i>=0) return i;} return -1; };
  const cDate   = idx(CLOUD.COLS.date);
  const cLeague = idx(CLOUD.COLS.league);
  const cStatus = idx(CLOUD.COLS.status);
  const cNote   = idx(CLOUD.COLS.note);
  return rows.map(r => ({
    date:   (r[cDate]||"").replace(/^"|"$/g,""),
    league: (r[cLeague]||"TSAA").replace(/^"|"$/g,""),
    status: (r[cStatus]||"已排").replace(/^"|"$/g,""),
    note:   (r[cNote]||"").replace(/^"|"$/g,"")
  }));
}

// Local 測試模式（若未設定 URL）
const LOCAL_KEY='DAUNTLESS_LOCAL_DATA';
function ensureLocalSeed(){
  let data = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
  if(!data){
    data = { schedule:[
      {date:'2025-11-09', league:'海客聯盟', status:'已排', note:''},
      {date:'2025-12-07', league:'美堤聯盟', status:'已排', note:''},
      {date:'2026-01-11', league:'海客聯盟', status:'需避開', note:'連假'}
    ], holiday:[
      {date:'2026-01-01', type:'國定假日'},
      {date:'2026-02-28', type:'國定假日'}
    ]};
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  }
  return data;
}
function readLocal(){ return ensureLocalSeed(); }
function writeLocalSchedule(payload){
  const data = ensureLocalSeed();
  const i = data.schedule.findIndex(x => x.date === payload.date);
  if(i>=0) data.schedule[i]=payload; else data.schedule.push(payload);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  return { ok:true, local:true };
}

// 寫回（同日覆蓋，無則新增）
async function postSchedule({date, league, status, note}){
  if(!CLOUD.APPS_SCRIPT_URL){
    return writeLocalSchedule({date, league, status, note});
  }
  const res = await fetch(CLOUD.APPS_SCRIPT_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ date, league, status, note })
  });
  if(!res.ok) throw new Error("GAS 寫回失敗");
  return await res.json();
}

window.Cloud = { CLOUD, fetchCSV, readLocal, writeLocalSchedule, postSchedule };
