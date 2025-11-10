
// Dauntless Scheduler v2.6.1 — Cloud Edition
const API_URL = window.__API_URL__;
const SHEET_SCHEDULE = window.__SHEET_URL_SCHEDULE_CSV__;
const SHEET_HOLIDAY  = window.__SHEET_URL_HOLIDAY_CSV__;

// --- Utils ---
const qs = (s)=>document.querySelector(s);
const fmt = (d)=> d.toISOString().slice(0,10);
const toDate = (s)=> new Date(s+"T00:00:00Z");
const today = new Date(); today.setUTCHours(0,0,0,0);

function quarterRangeFrom(d){
  const m = d.getUTCMonth(); const y = d.getUTCFullYear();
  const q = Math.floor(m/3); // 0..3
  const startM = q*3+1; // 1,4,7,10
  const end = new Date(Date.UTC(y, startM+3-1+1, 0)); // last day of quarter
  const start = new Date(Date.UTC(y, startM-1, 1));
  return { start, end, label: `${start.getUTCFullYear()}/${String(startM).padStart(2,"0")} ~ ${end.getUTCFullYear()}/${String(end.getUTCMonth()+1).padStart(2,"0")}` };
}
function nextQuarterRange(d){
  const m = d.getUTCMonth(); const y = d.getUTCFullYear();
  const next = new Date(Date.UTC(y, m+3, 1));
  return quarterRangeFrom(next);
}
function sundaysBetween(a,b){
  const out=[]; const d=new Date(a);
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7)); // next Sunday
  while(d<=b){ out.push(new Date(d)); d.setUTCDate(d.getUTCDate()+7); }
  return out;
}

function parseCSV(text){
  if(!text || !text.trim()) return [];
  const rows = text.trim().split(/\r?\n/).map(r=>r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c=>c.replace(/^"|"$/g,"")));
  const header = rows.shift().map(h=>h.trim().toLowerCase());
  const idx = (k)=> header.indexOf(k);
  const idDate = idx("date"), idLeague = idx("league"), idStatus = idx("status"), idNote = idx("note"), idIsHoliday = idx("is_holiday"), idHolidayName = idx("holiday_name");
  return rows.map(r=> ({
    date: r[idDate] || "",
    league: r[idLeague] || "",
    status: (r[idStatus]||"").toLowerCase(),
    note: r[idNote] || "",
    is_holiday: (r[idIsHoliday]||"").toLowerCase()==="true" || r[idIsHoliday]==="1",
    holiday_name: r[idHolidayName] || ""
  }));
}

// --- Cloud CSV fetcher ---
async function fetchCSV(type){
  try{
    const res = await fetch(`${API_URL}?type=${encodeURIComponent(type)}`, {cache:"no-store"});
    if(res.ok){
      const ct = res.headers.get("content-type") || "";
      if(ct.includes("json")){
        const arr = await res.json();
        if(Array.isArray(arr) && Array.isArray(arr[0])){
          const lines = arr.map(row => row.map(v=>String(v??"").includes(",")?`"${String(v).replace(/"/g,'""')}"`:String(v??"")).join(",")).join("\n");
          return parseCSV(lines);
        }
      }else{
        const text = await res.text();
        return parseCSV(text);
      }
    }
    throw new Error("代理失敗，改抓公開CSV");
  }catch{
    const u = type==="holiday" ? SHEET_HOLIDAY : SHEET_SCHEDULE;
    const r = await fetch(u, {cache:"no-store"});
    if(!r.ok) throw new Error("讀取失敗：" + r.status);
    const t = await r.text();
    return parseCSV(t);
  }
}

// --- Render ---
function badge(text){ return `<span class="badge">${text}</span>`; }

function renderGrids(model){
  const {thisQ, nextQ, booked, holiday} = model;
  qs("#rangeThis").textContent = model.thisLabel;
  qs("#rangeNext").textContent = model.nextLabel;

  const bookedMap = new Map(booked.map(x=>[x.date, x]));
  const holiSet = new Set(holiday.filter(h=>h.is_holiday).map(h=>h.date));

  function renderRange(container, rangeDates){
    container.innerHTML = "";
    rangeDates.forEach(d=>{
      const dstr = fmt(d);
      const num = `${String(d.getUTCMonth()+1).padStart(2,"0")}/${String(d.getUTCDate()).padStart(2,"0")}`;
      const bookedInfo = bookedMap.get(dstr);
      const isAvoid = holiSet.has(dstr) || (bookedInfo && bookedInfo.status==="avoid");
      const dot = `<span class="dot ${ bookedInfo ? "ok" : (isAvoid?"bad":"") }"></span>`;

      const right = bookedInfo
        ? `<div>${badge(bookedInfo.league||"—")} <span class="meta">${(bookedInfo.note||"")}</span></div>`
        : (isAvoid ? `<div class="warn">需避開</div>` : `<div class="muted">—</div>`);

      const el = document.createElement("div");
      el.className = "slot";
      el.innerHTML = `<div class="d">${dot}<b>${num}</b><span class="muted">${dstr}</span></div>${right}`;
      el.addEventListener("click", ()=> {
        if (dlgEditor.open && qs("#fDate")) qs("#fDate").value = dstr;
      });
      container.appendChild(el);
    });
  }

  renderRange(qs("#gridThis"), thisQ);
  renderRange(qs("#gridNext"), nextQ);
}

function computeAvoidList(model){
  const {allDates, booked, holiday} = model;
  const bookedMap = new Map(booked.map(x=>[x.date, x]));
  const holiMap = new Map(holiday.filter(h=>h.is_holiday).map(h=>[h.date, h.holiday_name || "連續假期"]));
  const out = [];
  allDates.forEach(d=>{
    const ds = fmt(d);
    const b = bookedMap.get(ds);
    const h = holiMap.get(ds);
    if (h || (b && (b.status==="avoid" || b.status==="booked"))) {
      out.push({date: ds, reason: h ? h : (b.status==="avoid" ? "需避開" : `已排（${b.league||""}）`)});
    }
  });
  return out.filter(x=> toDate(x.date) >= today );
}

// --- Cloud write (POST) ---
async function writeSchedule({date, league, status, note}){
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({date, league, status, note})
  });
  if(!res.ok) throw new Error("寫入失敗：" + res.status);
  const js = await res.json().catch(()=>({ok:false}));
  if(!js.ok) throw new Error("寫入失敗（雲端回應）");
}

// --- Bootstrap ---
async function bootstrap(){
  try{
    qs("#srcLabel").textContent = "雲端";
    const [sched, holi] = await Promise.all([fetchCSV("schedule"), fetchCSV("holiday")]);
    const qThis = quarterRangeFrom(today);
    const qNext = nextQuarterRange(today);
    const thisQ = sundaysBetween(qThis.start, qThis.end);
    const nextQ = sundaysBetween(qNext.start, qNext.end);
    const allDates = [...thisQ, ...nextQ];

    qs("#kpiWeeks").textContent = String(thisQ.length);
    const setBooked = new Set(sched.filter(x=>x.status==="booked").map(x=>x.date));
    qs("#kpiThisBooked").textContent = String(thisQ.filter(d => setBooked.has(fmt(d))).length);
    qs("#kpiNextBooked").textContent = String(nextQ.filter(d => setBooked.has(fmt(d))).length);
    const avoidN = computeAvoidList({allDates, booked:sched, holiday:holi}).length;
    qs("#kpiAvoid").textContent = String(avoidN);

    renderGrids({thisQ, nextQ, booked:sched, holiday:holi, allDates,
      thisLabel:qThis.label, nextLabel:qNext.label
    });

    window.__SUNDAYS__ = allDates.map(d=>fmt(d));
  }catch(err){
    alert("讀取失敗（CloudLink）："+ err.message);
    console.error(err);
  }
}

// --- UI Bindings ---
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault(); deferredPrompt = e; qs("#btnInstall").style.display="inline-flex";
});
qs("#btnInstall").addEventListener("click", async ()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; }});
qs("#btnReload").addEventListener("click", ()=> bootstrap());

const dlgEditor = document.getElementById("dlgEditor");
qs("#btnOpenEditor").addEventListener("click", ()=>{
  qs("#fDate").value = ""; qs("#fNote").value="";
  dlgEditor.showModal();
});
qs("#btnPickSunday").addEventListener("click", ()=>{
  const wrap = qs("#inlineSundayList");
  const days = (window.__SUNDAYS__||[]);
  wrap.innerHTML = days.map(d=>`<button class="btn" data-date="${d}" style="margin:4px 6px">${d}</button>`).join("");
  wrap.style.display="block";
  wrap.querySelectorAll("button").forEach(b=> b.addEventListener("click", ()=>{ qs("#fDate").value=b.dataset.date; }));
});
qs("#btnSave").addEventListener("click", async ()=>{
  try{
    const date = qs("#fDate").value.trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("日期格式錯誤（YYYY-MM-DD）");
    const payload = {
      date,
      league: qs("#fLeague").value.trim(),
      status: qs("#fStatus").value.trim(),
      note: qs("#fNote").value.trim()
    };
    await writeSchedule(payload);
    alert("已寫入雲端！");
    dlgEditor.close();
    bootstrap();
  }catch(err){ alert(err.message); }
});

qs("#btnQueryAvoid").addEventListener("click", async ()=>{
  try{
    const [sched, holi] = await Promise.all([fetchCSV("schedule"), fetchCSV("holiday")]);
    const qThis = quarterRangeFrom(today);
    const qNext = nextQuarterRange(today);
    const thisQ = sundaysBetween(qThis.start, qThis.end);
    const nextQ = sundaysBetween(qNext.start, qNext.end);
    const allDates = [...thisQ, ...nextQ];

    const list = computeAvoidList({allDates, booked:sched, holiday:holi});
    const box = qs("#avoidList");
    if(list.length===0) box.innerHTML = "<div class='muted'>兩季內沒有需避開的週日。</div>";
    else box.innerHTML = list.map(x=>`<div class='slot'><div class='d'><span class='dot bad'></span><b>${x.date.slice(5).replace('-','/')}</b><span class='muted'>${x.date}</span></div><div>${x.reason}</div></div>`).join("");
    document.getElementById("dlgAvoid").showModal();
  }catch(err){ alert("查詢失敗：" + err.message); }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", ()=> navigator.serviceWorker.register("./service-worker.js"));
}

bootstrap();
