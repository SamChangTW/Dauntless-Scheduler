// Dauntless Scheduler v2.2 — CloudLink (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}

const els = {
  qA: document.getElementById('qA'),
  qB: document.getElementById('qB'),
  listA: document.getElementById('listA'),
  listB: document.getElementById('listB'),
  kpiSunA: document.getElementById('kpiSunA'),
  kpiSchA: document.getElementById('kpiSchA'),
  kpiSchB: document.getElementById('kpiSchB'),
  kpiAvoid: document.getElementById('kpiAvoid'),
  btnImportSchedule: document.getElementById('btnImportSchedule'),
  btnImportHoliday: document.getElementById('btnImportHoliday'),
  fileSchedule: document.getElementById('fileSchedule'),
  fileHoliday: document.getElementById('fileHoliday'),
  btnSave: document.getElementById('btnSave'),
  btnReset: document.getElementById('btnReset'),
  btnAvoid: document.getElementById('btnAvoid'),
  dlgAvoid: document.getElementById('dlgAvoid'),
  avoidBody: document.getElementById('avoidBody'),
  btnCloseDlg: document.getElementById('btnCloseDlg'),
};

const fmtMD = d => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
const fmtISO = d => d.toISOString().slice(0,10);
function startOfQuarter(date){
  const m = date.getMonth();
  const qStartMonth = Math.floor(m/3)*3;
  return new Date(date.getFullYear(), qStartMonth, 1);
}
function addMonths(date, n){ return new Date(date.getFullYear(), date.getMonth()+n, 1); }
function sundaysBetween(start, end){
  const res=[];
  let d = new Date(start);
  while(d.getDay()!==0){ d.setDate(d.getDate()+1); }
  while(d<=end){
    res.push(new Date(d));
    d.setDate(d.getDate()+7);
  }
  return res;
}

let scheduleDates = new Set();
let avoidDates = new Set();
let holidayRanges = [];

function saveState(){
  const data={
    schedule:[...scheduleDates],
    holidays: holidayRanges.map(r=>({start:fmtISO(r.start), end:fmtISO(r.end)})),
    savedAt: Date.now()
  };
  localStorage.setItem('ds22', JSON.stringify(data));
  alert('已儲存設定與資料（本機）');
}
function loadState(){
  const raw=localStorage.getItem('ds22');
  if(!raw) return;
  try{
    const j=JSON.parse(raw);
    scheduleDates = new Set(j.schedule||[]);
    holidayRanges = (j.holidays||[]).map(r=>({start:new Date(r.start), end:new Date(r.end)}));
  }catch(e){ console.warn(e); }
}

async function readXlsx(file){
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, {type:'array'});
  return wb;
}
function parseSchedule(wb){
  const sheetName = wb.Sheets['Schedule'] ? 'Schedule' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(ws, {defval:'', raw:false});
  if(json.length===0) return new Set();
  let dateKey = Object.keys(json[0]).find(k=>k.toLowerCase().includes('date')) || Object.keys(json[0])[0];
  const out = new Set();
  json.forEach(row=>{
    const v = row[dateKey];
    if(!v) return;
    const d = new Date(v);
    if(!isNaN(d) && d.getDay()===0){ out.add(fmtISO(d)); }
  });
  return out;
}
function parseHolidays(wb){
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, {defval:'', raw:false});
  if(json.length===0) return [];
  const keys = Object.keys(json[0]);
  let kStart = keys.find(k=>k.toLowerCase().includes('start')) || keys[0];
  let kEnd   = keys.find(k=>k.toLowerCase().includes('end'))   || keys[1] || keys[0];
  const ranges=[];
  json.forEach(r=>{
    const s = new Date(r[kStart]); const e = new Date(r[kEnd]||r[kStart]);
    if(!isNaN(s) && !isNaN(e)){
      const a = s<e? s:e, b = s<e? e:s;
      ranges.push({start:a, end:b});
    }
  });
  return ranges;
}

function computeAndRender(){
  const today = new Date();
  const qStart = startOfQuarter(today);
  const qEndA = new Date(qStart.getFullYear(), qStart.getMonth()+3, 0);
  const qStartB = addMonths(qStart,3);
  const qEndB = new Date(qStartB.getFullYear(), qStartB.getMonth()+3, 0);
  els.qA.textContent = `本季（日） ${qStart.getFullYear()}/${qStart.getMonth()+1} ~ ${qEndA.getFullYear()}/${qEndA.getMonth()+1}`;
  els.qB.textContent = `次季（日） ${qStartB.getFullYear()}/${qStartB.getMonth()+1} ~ ${qEndB.getFullYear()}/${qEndB.getMonth()+1}`;

  const sunA = sundaysBetween(qStart, qEndA);
  const sunB = sundaysBetween(qStartB, qEndB);

  avoidDates = new Set();
  function sundayIsInHoliday(d){
    return holidayRanges.some(r=> d>=r.start && d<=r.end );
  }
  function toPill(d, type){
    const dot = type==='schedule' ? 'scheduled' : type==='avoid' ? 'avoid' : 'none';
    const label = fmtMD(d);
    const t = document.createElement('div');
    t.className='pill';
    t.innerHTML = `<span class="dot ${dot}"></span><b>${label}</b><span class="muted small">${d.toISOString().slice(0,10)}</span>`;
    return t;
  }

  els.listA.innerHTML=''; els.listB.innerHTML='';
  let schA=0, schB=0;
  sunA.forEach(d=>{
    const iso = fmtISO(d);
    const wrap = document.createElement('div');
    let any=false;
    if(scheduleDates.has(iso)){ schA++; wrap.appendChild(toPill(d,'schedule')); any=true; }
    if(sundayIsInHoliday(d) || scheduleDates.has(iso)){
      avoidDates.add(iso);
      wrap.appendChild(toPill(d,'avoid')); any=true;
    }
    if(!any){ wrap.appendChild(toPill(d,'none')); wrap.querySelector('.dot').style.background='#3a3f4b'; }
    els.listA.appendChild(wrap);
  });
  sunB.forEach(d=>{
    const iso = fmtISO(d);
    const wrap = document.createElement('div');
    let any=false;
    if(scheduleDates.has(iso)){ schB++; wrap.appendChild(toPill(d,'schedule')); any=true; }
    if(sundayIsInHoliday(d) || scheduleDates.has(iso)){
      avoidDates.add(iso);
      wrap.appendChild(toPill(d,'avoid')); any=true;
    }
    if(!any){ wrap.appendChild(toPill(d,'none')); wrap.querySelector('.dot').style.background='#3a3f4b'; }
    els.listB.appendChild(wrap);
  });

  els.kpiSunA.textContent = sunA.length;
  els.kpiSchA.textContent = schA;
  els.kpiSchB.textContent = schB;
  els.kpiAvoid.textContent = avoidDates.size;
}

els.btnImportSchedule.addEventListener('click', ()=>els.fileSchedule.click());
els.btnImportHoliday.addEventListener('click', ()=>els.fileHoliday.click());

els.fileSchedule.addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const wb = await readXlsx(f);
  scheduleDates = parseSchedule(wb);
  computeAndRender();
});
els.fileHoliday.addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const wb = await readXlsx(f);
  holidayRanges = parseHolidays(wb);
  computeAndRender();
});

els.btnSave.addEventListener('click', saveState);
els.btnReset.addEventListener('click', ()=>{
  if(!confirm('確定要清除本機資料與設定嗎？')) return;
  localStorage.removeItem('ds22');
  scheduleDates = new Set();
  holidayRanges = [];
  computeAndRender();
});

els.btnAvoid.addEventListener('click', ()=>{
  const items = [...avoidDates].sort();
  const out = items.map(iso=>{
    const d = new Date(iso);
    return `<span class="datepill"><span class="dot avoid"></span>${fmtMD(d)}<span class="muted small">(${iso})</span></span>`;
  }).join('');
  document.getElementById('avoidBody').innerHTML = out || '<span class="muted">目前沒有需避開的週日</span>';
  els.dlgAvoid.showModal();
});
document.getElementById('btnCloseDlg').addEventListener('click', ()=>els.dlgAvoid.close());

loadState();
computeAndRender();
