const C = window.DS_CONFIG;
const qs = (s)=>document.querySelector(s);
const log = (m)=>{ qs('#console').textContent += `\n${m}`; };

const z=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;

function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift().split(",");
  const idx = (name)=> header.findIndex(h => h.toLowerCase().trim()===name.toLowerCase());
  const iDate = idx("date"), iLeague=idx("league"), iStatus=idx("status"), iNote = idx("notes")>=0?idx("notes"):idx("note");
  return lines.map(line => {
    const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    const val = c => (c>=0 && parts[c]!==undefined)? parts[c].replace(/^"|"$/g,"") : "";
    return { date: val(iDate), league: val(iLeague), status: val(iStatus), note: val(iNote) };
  });
}

async function fetchCSV(url){
  const r = await fetch(url, {cache:"no-store"});
  if(!r.ok) throw new Error(`CSV ${r.status}`);
  return parseCSV(await r.text());
}

function calcSundaysTwoQuarters(){
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay()+6)%7));
  const list = [];
  for(let i=0;i<26;i++){
    const d = new Date(start);
    d.setDate(start.getDate() + i*7);
    list.push(ymd(d));
  }
  return list;
}

function renderSlots(allDates, bookedDates, holidays){
  const boxA = qs('#listThis'), boxB = qs('#listNext');
  boxA.innerHTML = ""; boxB.innerHTML = "";
  const half = Math.ceil(allDates.length/2);
  const booked = new Set(bookedDates);
  const avoid = new Set(holidays);
  const mk = (d)=>{
    const el = document.createElement('div');
    el.className = "slot"; el.textContent = d;
    if(booked.has(d)) el.style.borderColor = "#2d5f3c";
    if(avoid.has(d)) el.style.borderColor = "#5f2d2d";
    return el;
  };
  allDates.slice(0,half).forEach(d => boxA.appendChild(mk(d)));
  allDates.slice(half).forEach(d => boxB.appendChild(mk(d)));
  qs('#weeksThis').textContent = String(half);
  qs('#countThis').textContent = String(bookedDates.filter(d => allDates.indexOf(d) < half).length);
  qs('#countNext').textContent = String(bookedDates.filter(d => allDates.indexOf(d) >= half).length);
  qs('#countAvoid').textContent = String(holidays.length);
}

function buildAvoidList(allDates, bookedDates, holidays){
  const setB = new Set(bookedDates);
  const setH = new Set(holidays);
  const avoid = allDates.filter(d => setB.has(d) || setH.has(d));
  const ol = qs('#avoidList');
  if(!ol) return;
  ol.innerHTML = "";
  avoid.forEach(d => {
    const li = document.createElement('li');
    const dt = new Date(d);
    li.textContent = `${dt.getMonth()+1}/${dt.getDate()}（${d}）`;
    ol.appendChild(li);
  });
}

async function bootstrap(){
  log("啟動中…");
  try{
    log("讀取賽程 CSV…");
    const schedule = await fetchCSV(C.SHEET_URL_SCHEDULE_CSV);
    log("讀取假期 CSV…");
    const holiday = await fetchCSV(C.SHEET_URL_HOLIDAY_CSV);

    const scheduledDates = schedule.map(r=>r.date).filter(Boolean);
    const holidays = holiday.map(r=>r.date).filter(Boolean);
    const sundays = calcSundaysTwoQuarters();

    renderSlots(sundays, scheduledDates, holidays);
    buildAvoidList(sundays, scheduledDates, holidays);
    log("✓ 初始化完成");
  }catch(err){
    log("初始化失敗：" + err.message);
  }
}

async function saveToCloud(){
  const date = qs('#f_date').value.trim();
  const league = qs('#f_league').value.trim() || "TSAA";
  const status = qs('#f_status').value.trim() || "scheduled";
  const note = qs('#f_note').value.trim();

  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){
    alert("日期格式錯誤，請用 YYYY-MM-DD，例如 2025-11-16");
    return;
  }
  if(!C.API_URL || C.API_URL.includes("REPLACE_WITH")){
    alert("尚未設定 API_URL（Apps Script /exec）。請先在 js/config.js 內填入你的 Web App URL。");
    return;
  }
  try{
    const res = await fetch(C.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, league, status, note })
    });
    const ans = await res.json();
    if(ans.status === "success"){
      alert("✅ 已寫入雲端");
      location.reload();
    }else{
      alert("⚠️ 失敗：" + (ans.message || "Unknown"));
    }
  }catch(err){
    alert("❌ 連線錯誤：" + err.message);
  }
}

window.addEventListener("DOMContentLoaded", ()=>{
  bootstrap();
  const dlg = qs('#dlgForm');
  qs('#btnOpenForm').addEventListener("click", ()=> dlg.showModal());
  qs('#btnClose').addEventListener("click", ()=> dlg.close());
  qs('#btnSubmit').addEventListener("click", (e)=>{ e.preventDefault(); saveToCloud(); });
  qs('#btnAvoid').addEventListener("click", ()=> qs('#dlgAvoid').showModal());
  qs('#btnCloseAvoid').addEventListener("click", ()=> qs('#dlgAvoid').close());
  qs('#btnReload').addEventListener("click", ()=> location.reload());
});
