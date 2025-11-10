// DS main (v2.7 CloudLink Stable)
const C = window.DS_CONFIG;
const qs = s=>document.querySelector(s);
const fmt = d=> d.toISOString().slice(0,10);
const today = new Date(); today.setUTCHours(0,0,0,0);

function quarterRangeFrom(d){
  const m = d.getUTCMonth(); const y = d.getUTCFullYear();
  const q = Math.floor(m/3); const startM = q*3+1;
  const end = new Date(Date.UTC(y, startM+3-1+1, 0));
  const start = new Date(Date.UTC(y, startM-1, 1));
  return {start,end,label:`${start.getUTCFullYear()}/${String(startM).padStart(2,"0")} ~ ${end.getUTCFullYear()}/${String(end.getUTCMonth()+1).padStart(2,"0")}`};
}
function nextQuarterRange(d){ const m=d.getUTCMonth(), y=d.getUTCFullYear(); return quarterRangeFrom(new Date(Date.UTC(y,m+3,1))); }
function sundaysBetween(a,b){ const out=[], d=new Date(a); d.setUTCDate(d.getUTCDate()+((7-d.getUTCDay())%7)); while(d<=b){ out.push(new Date(d)); d.setUTCDate(d.getUTCDate()+7);} return out; }

function parseCSV(text){
  if(!text || !text.trim()) return [];
  const rows=text.trim().split(/\r?\n/).map(r=>r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c=>c.replace(/^"|"$/g,"")));
  const header=rows.shift().map(h=>h.trim().toLowerCase());
  const idx=k=>header.indexOf(k);
  const idDate=idx("date"), idLeague=idx("league"), idStatus=idx("status"), idNote=idx("note"), idIsHoliday=idx("is_holiday"), idHolidayName=idx("holiday_name");
  return rows.map(r=>({
    date:r[idDate]||"", league:r[idLeague]||"", status:(r[idStatus]||"").toLowerCase(), note:r[idNote]||"",
    is_holiday:(r[idIsHoliday]||"").toLowerCase()==="true"||r[idIsHoliday]==="1", holiday_name:r[idHolidayName]||""
  }));
}

async function fetchWithRetry(url, opt={}, n=2){
  let last; for(let i=0;i<=n;i++){ try{ const r=await fetch(url,opt); if(!r.ok) throw new Error(r.status); return r; }catch(e){ last=e; } }
  throw last || new Error("fetch failed");
}

async function fetchCSV(type){
  FC.log(`fetch ${type} via API…`);
  try{
    const res = await fetchWithRetry(`${C.API_URL}?type=${encodeURIComponent(type)}`, {cache:"no-store"}, 1);
    FC.log(`API ${type} -> ${res.status}`);
    const ct=res.headers.get("content-type")||"";
    if(ct.includes("json")){
      const arr = await res.json();
      if(Array.isArray(arr) && Array.isArray(arr[0])){
        const lines = arr.map(row=>row.map(v=>String(v??"").includes(",")?`"${String(v).replace(/"/g,'""')}"`:String(v??"")).join(",")).join("\n");
        return parseCSV(lines);
      }
    }else{
      return parseCSV(await res.text());
    }
  }catch(e){
    FC.log(`fallback ${type} CSV`);
    const u = type==="holiday"? C.SHEET_URL_HOLIDAY_CSV : C.SHEET_URL_SCHEDULE_CSV;
    const r = await fetchWithRetry(u, {cache:"no-store"}, 1);
    return parseCSV(await r.text());
  }
}

function badge(text){ return `<span class="badge">${text}</span>`; }
function renderGrids(model){
  const {thisQ,nextQ,booked,holiday}=model;
  qs("#rangeThis").textContent = model.thisLabel;
  qs("#rangeNext").textContent = model.nextLabel;
  const bookedMap = new Map(booked.map(x=>[x.date,x]));
  const holiSet = new Set(holiday.filter(h=>h.is_holiday).map(h=>h.date));
  function render(container, dates){
    container.innerHTML="";
    dates.forEach(d=>{
      const dstr=fmt(d); const num=`${String(d.getUTCMonth()+1).padStart(2,"0")}/${String(d.getUTCDate()).padStart(2,"0")}`;
      const b=bookedMap.get(dstr);
      const isAvoid = holiSet.has(dstr) || (b && b.status==="avoid");
      const dot = `<span class="dot ${ b ? "ok" : (isAvoid?"bad":"") }"></span>`;
      const right = b ? `<div>${badge(b.league||"—")} <span class="meta">${b.note||""}</span></div>` :
                        (isAvoid? `<div class="warn">需避開</div>` : `<div class="muted">—</div>`);
      const el=document.createElement("div"); el.className="slot";
      el.innerHTML = `<div class="d">${dot}<b>${num}</b><span class="muted">${dstr}</span></div>${right}`;
      el.addEventListener("click", ()=>{ if(dlgEditor.open && qs("#fDate")) qs("#fDate").value=dstr; });
      container.appendChild(el);
    });
  }
  render(qs("#gridThis"), thisQ); render(qs("#gridNext"), nextQ);
}

function computeAvoidList(model){
  const {allDates, booked, holiday}=model;
  const bookedMap = new Map(booked.map(x=>[x.date,x]));
  const holiMap = new Map(holiday.filter(h=>h.is_holiday).map(h=>[h.date, h.holiday_name||"連續假期"]));
  const out=[];
  allDates.forEach(d=>{
    const ds = fmt(d); const b=bookedMap.get(ds); const h=holiMap.get(ds);
    if(h || (b && (b.status==="avoid"||b.status==="booked"))) out.push({date:ds, reason:h? h : (b.status==="avoid"?"需避開":`已排（${b.league||""}）`)});
  });
  return out.filter(x=> new Date(x.date+"T00:00:00Z")>=today );
}

function normalizeDateInput(s) {
  if (!s) return "";
  s = s.trim().replace(/[.\/]/g, "-").replace(/\s+/g, "");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return "";
  const y = m[1];
  const mm = String(parseInt(m[2], 10)).padStart(2, "0");
  const dd = String(parseInt(m[3], 10)).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

async function writeSchedule({date, league, status, note}){
  FC.log(`POST ${C.API_URL}`);
  const res = await fetch(C.API_URL, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({date,league,status,note})});
  if(!res.ok) throw new Error("寫入失敗："+res.status);
  const js = await res.json().catch(()=>({ok:false,status:""}));
  if(!(js.ok || js.status==="ok")) throw new Error("寫入失敗（雲端回應）");
}

async function bootstrap(){
  try{
    qs("#srcLabel").textContent="雲端";
    FC.log("Bootstrap start");
    const [sched, holi] = await Promise.all([fetchCSV("schedule"), fetchCSV("holiday")]);
    const qThis = quarterRangeFrom(today); const qNext = nextQuarterRange(today);
    const thisQ = sundaysBetween(qThis.start, qThis.end); const nextQ = sundaysBetween(qNext.start, qNext.end);
    const allDates = [...thisQ, ...nextQ];
    qs("#kpiWeeks").textContent = String(thisQ.length);
    const setBooked = new Set(sched.filter(x=>x.status==="booked").map(x=>x.date));
    qs("#kpiThisBooked").textContent = String(thisQ.filter(d=>setBooked.has(fmt(d))).length);
    qs("#kpiNextBooked").textContent = String(nextQ.filter(d=>setBooked.has(fmt(d))).length);
    qs("#kpiAvoid").textContent = String(computeAvoidList({allDates,booked:sched,holiday:holi}).length);
    renderGrids({thisQ,nextQ,booked:sched,holiday:holi,allDates,thisLabel:qThis.label,nextLabel:qNext.label});
    window.__SUNDAYS__ = allDates.map(d=>fmt(d));
    FC.log("✔️ 系統初始化完成");
  }catch(err){
    FC.log("Error: "+err.message);
    alert("讀取失敗（CloudLink）："+err.message);
  }
}

const dlgEditor = document.getElementById("dlgEditor");
qs("#btnOpenEditor").addEventListener("click", ()=>{ const f=qs("#fDate"); if(f) f.value=""; const n=qs("#fNote"); if(n) n.value=""; dlgEditor.showModal(); });

qs("#btnPickSunday").addEventListener("click", ()=>{
  const wrap = document.querySelector("#inlineSundayList");
  wrap.innerHTML = (window.__SUNDAYS__||[]).map(d=>`<button class="btn" data-date="${d}" style="margin:4px 6px">${d}</button>`).join("");
  wrap.style.display="block";
  wrap.querySelectorAll("button").forEach(b=> b.addEventListener("click", ()=>{ document.querySelector("#fDate").value=b.dataset.date; }));
});

document.querySelector("#btnSave").addEventListener("click", async ()=>{
  try{
    const raw = (document.querySelector("#fDate")?.value||"");
    const norm = normalizeDateInput(raw);
    if(!norm){ alert(`日期格式錯誤：${raw||"(空白)"}。請用 2025-11-16 或 2025/11/16`); return; }
    await writeSchedule({date:norm, league:document.querySelector("#fLeague").value.trim(), status:document.querySelector("#fStatus").value.trim(), note:document.querySelector("#fNote").value.trim()});
    alert("已寫入雲端！"); dlgEditor.close(); bootstrap();
  }catch(err){ alert(err.message); FC.log("POST error: "+err.message); }
});

document.querySelector("#btnQueryAvoid").addEventListener("click", async ()=>{
  try{
    const [sched, holi] = await Promise.all([fetchCSV("schedule"), fetchCSV("holiday")]);
    const qThis = quarterRangeFrom(today), qNext = nextQuarterRange(today);
    const thisQ = sundaysBetween(qThis.start, qThis.end), nextQ = sundaysBetween(qNext.start, qNext.end);
    const list = computeAvoidList({allDates:[...thisQ,...nextQ], booked:sched, holiday:holi});
    const box = document.querySelector("#avoidList");
    box.innerHTML = list.length? list.map(x=>`<div class='slot'><div class='d'><span class='dot bad'></span><b>${x.date.slice(5).replace('-','/')}</b><span class='muted'>${x.date}</span></div><div>${x.reason}</div></div>`).join("") : "<div class='muted'>兩季內沒有需避開的週日。</div>";
    document.getElementById("dlgAvoid").showModal();
  }catch(err){ alert("查詢失敗："+err.message); }
});
document.querySelector("#btnReload").addEventListener("click", ()=> bootstrap());

bootstrap();
