const $=s=>document.querySelector(s);
const q1Title=$("#q1Title"), q2Title=$("#q2Title"), q1List=$("#q1List"), q2List=$("#q2List");
const dlgEdit=$("#dlgEdit"), f_date=$("#f_date"), f_state=$("#f_state"), f_note=$("#f_note");
const dlgLink=$("#dlgLink"), dlgAvoid=$("#dlgAvoid"), avoidTitle=$("#avoidTitle"), avoidList=$("#avoidList");

let holidays=[]; // [{date:'YYYY-MM-DD', isHoliday:true, name:'...'}]
let core={};    // map: dateISO -> {state:'ok|busy|avoid|empty', note:''}
let logs=[];

// install prompt hook
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault(); deferredPrompt=e;});
$("#btnInstall").onclick=async()=>{ if(deferredPrompt){deferredPrompt.prompt(); deferredPrompt=null;} };

$("#btnLink").onclick=()=> dlgLink.showModal();
$("#btnShowAvoid").onclick=showAvoidDual;
$("#selStart").addEventListener('change', render);
$("#btnReset").onclick=()=>{ Object.keys(core).forEach(d=> core[d]={state:'empty',note:''}); markHolidayAvoid(); render(); };
$("#btnExport").onclick=exportXlsx;

$("#pickHoliday").addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; holidays = await readHolidayXlsx(f); render(); });
$("#pickCore").addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; core = await readCoreXlsx(f); render(); });
$("#pickLog").addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(!f) return; logs = await readLogXlsx(f); });

function render(){
  const range = dualQuarterRange();
  q1Title.textContent = `${range.q1Name}（${range.q1Months[0]}–${range.q1Months[2]}）`;
  q2Title.textContent = `${range.q2Name}（${range.q2Months[0]}–${range.q2Months[2]}）`;

  // Seed Sundays
  rangeAllSundays(range).forEach(d=>{ if(!core[d]) core[d]={state:'empty',note:''}; });
  markHolidayAvoid();

  // Lists
  const [q1Groups,q2Groups] = [range.q1Months,range.q2Months].map(ms=> sundaysOfMonths(ms));
  q1List.innerHTML = renderMonthGroup(q1Groups);
  q2List.innerHTML = renderMonthGroup(q2Groups);
}

function renderMonthGroup(groups){
  return groups.map(g=>{
    const rows = g.sundays.map(d=>{
      const o = core[d]||{state:'empty',note:''};
      const cls = o.state==='ok'?'ok':o.state==='busy'?'busy':o.state==='avoid'?'avoid':'empty';
      const label = o.state==='ok'?'可排':o.state==='busy'?'已排':o.state==='avoid'?'避開':'未設定';
      return `<div class="sunrow">
        <div><b>${humanDate(d)}</b><div class="note">${o.note?escapeHTML(o.note):''}</div></div>
        <div class="row">
          <span class="tag ${cls}">${label}</span>
          <button onclick="openEdit('${d}')">編輯</button>
        </div>
      </div>`;
    }).join('');
    return `<div class="sep"></div><div class="qhdr"><div class="qtitle">${g.month.replace('-','/')}</div></div>${rows}`;
  }).join('');
}

function showAvoidDual(){
  const range = dualQuarterRange();
  const list = rangeAllSundays(range).filter(d=> core[d]?.state==='avoid');
  avoidTitle.textContent = `📅 避開日期（${range.q1Name}–${range.q2Name}｜${range.q1Months[0]}–${range.q2Months[2]}）`;
  if(!list.length){
    avoidList.innerHTML = `<div class="note">✅ 本雙季無避開週日</div>`;
  }else{
    avoidList.innerHTML = list.map(d=>{
      const m=d.slice(5,7), dd=d.slice(8,10);
      const note = core[d]?.note||'';
      return `<div class="sunrow"><div><b>${m}/${dd}</b></div><div class="tag avoid">${note||'避開'}</div></div>`;
    }).join('');
  }
  dlgAvoid.showModal();
}

// Edit dialog
window.openEdit=(dateISO)=>{
  dlgEdit.dataset.date=dateISO;
  $("#f_date").textContent=dateISO;
  const cur=core[dateISO]||{state:'empty',note:''};
  $("#f_state").value=cur.state; $("#f_note").value=cur.note||'';
  dlgEdit.showModal();
};
$("#btnSave").onclick=(e)=>{
  e.preventDefault();
  const d=dlgEdit.dataset.date;
  core[d]={state:$("#f_state").value, note:$("#f_note").value.trim()};
  dlgEdit.close(); render();
};

// Export
function exportXlsx(){
  const wb = XLSX.utils.book_new();
  const range = dualQuarterRange();
  const avoids = rangeAllSundays(range).filter(d=> core[d]?.state==='avoid').map(d=>({date:d,note:core[d]?.note||''}));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(avoids.length?avoids:[{date:'',note:''}]), "Avoid_Sundays");
  const stamp=new Date().toISOString().slice(0,19).replace('T',' ');
  const appended = Object.entries(core).map(([d,o])=>({timestamp:stamp,date:d,state:o.state,note:o.note||''}));
  const logAll=[...(logs||[]),...appended];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logAll.length?logAll:[{timestamp:'',date:'',state:'',note:''}]), "Scheduler_Log");
  const coreArr=Object.entries(core).map(([d,o])=>({date:d,state:o.state,note:o.note||''}));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(coreArr.length?coreArr:[{date:'',state:'',note:''}]), "Core_Schedule");
  XLSX.writeFile(wb, "Dauntless_Reports_v1.9.3.xlsx");
}

// Helpers
function dualQuarterRange(){
  const [y,m]=$("#selStart").value.split('-').map(Number);
  const qStartMonth=((Math.floor((m-1)/3))*3)+1;
  const q1Start={y, m:qStartMonth};
  const q2Start=addMonths(q1Start,3);
  return {
    q1Name:qName(q1Start), q2Name:qName(q2Start),
    q1Months:[0,1,2].map(i=>monthId(addMonths(q1Start,i))),
    q2Months:[0,1,2].map(i=>monthId(addMonths(q2Start,i))),
  };
}
function qName({m}){ return m<=3?'Q1':m<=6?'Q2':m<=9?'Q3':'Q4'; }
function addMonths({y,m},k){ const d=new Date(y,m-1,1); d.setMonth(d.getMonth()+k); return {y:d.getFullYear(), m:d.getMonth()+1}; }
function monthId({y,m}){ return `${y}-${String(m).padStart(2,'0')}`; }

function rangeAllSundays(range){
  return [...range.q1Months, ...range.q2Months].flatMap(id=>{
    const [y,m]=id.split('-').map(Number);
    const first=new Date(y,m-1,1), last=new Date(y,m,0);
    const out=[];
    for(let d=new Date(first); d<=last; d.setDate(d.getDate()+1)){
      if(d.getDay()===0) out.push(d.toISOString().slice(0,10));
    }
    return out;
  });
}

function sundaysOfMonths(monthIds){
  return monthIds.map(id=>{
    const [y,m]=id.split('-').map(Number);
    const first=new Date(y,m-1,1), last=new Date(y,m,0);
    const suns=[];
    for(let d=new Date(first); d<=last; d.setDate(d.getDate()+1)){
      if(d.getDay()===0) suns.push(d.toISOString().slice(0,10));
    }
    return {month:id, sundays:suns};
  });
}

function humanDate(iso){ const m=iso.slice(5,7), d=iso.slice(8,10); return `${m}/${d}（日）`; }
const escapeHTML = s=> s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// Holidays mark (doesn't override busy)
function markHolidayAvoid(){
  holidays.forEach(h=>{
    if(h.isHoliday && core[h.date] && core[h.date].state!=='busy'){
      core[h.date] = {state:'avoid', note: core[h.date].note || (h.name||'連假/假日')};
    }
  });
}

// XLSX readers
async function readHolidayXlsx(file){
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:'array'});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
  return rows.map(r=>{
    const date=(r.date||r.Date||r.日期||'').toString().trim();
    const isHoliday=(String(r.is_holiday??r.holiday??r.是否放假??'').toLowerCase().includes('true'))||r.is_holiday===1;
    const name=r.holiday_name||r.name||r.名稱||'';
    return {date,isHoliday,name};
  }).filter(r=>r.date);
}
async function readCoreXlsx(file){
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:'array'});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
  const map={};
  rows.forEach(r=>{
    const d=(r.date||r.Date||r.日期||'').toString().trim();
    if(!d) return;
    const st=(r.state||r.Status||r.狀態||'empty').toString().trim().toLowerCase();
    const note=(r.note||r.備註||'').toString();
    map[d]={state:['ok','busy','avoid','empty'].includes(st)?st:'empty', note};
  });
  return map;
}
async function readLogXlsx(file){
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:'array'});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
  return rows.map(r=>({timestamp:r.timestamp||r.ts||'', date:r.date||'', state:r.state||'', note:r.note||''}));
}

// Boot
render();