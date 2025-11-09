const qs = s => document.querySelector(s);

async function loadData(){
  if(Cloud.CLOUD.SCHEDULE_CSV){
    const schedule = await Cloud.fetchCSV(Cloud.CLOUD.SCHEDULE_CSV);
    const holiday  = Cloud.CLOUD.HOLIDAY_CSV ? await Cloud.fetchCSV(Cloud.CLOUD.HOLIDAY_CSV) : [];
    return { schedule, holiday, src:'雲端' };
  }else{
    const d = Cloud.readLocal();
    return { schedule: d.schedule, holiday: d.holiday, src:'本機' };
  }
}

function computeAvoid(holiday, schedule){
  const set = new Set();
  schedule.forEach(s => { if ((s.status||'')==='需避開') set.add(s.date); });
  holiday.forEach(h => { const d=new Date(h.date); if(d.getDay()===0) set.add(UI.fmtISO(d)); });
  return set;
}

function renderQuarter(listEl, sundays, scheduleMap, avoidSet){
  listEl.innerHTML = sundays.map(d => UI.slotHTML(d, scheduleMap.has(d), avoidSet.has(d))).join('');
}

async function bootstrap(){
  const {q1s,q1e,q2s,q2e} = UI.qRangesFromToday();
  qs('#q1Title').textContent = `本季（日） ${q1s.toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit'})} ~ ${q1e.toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit'})}`;
  qs('#q2Title').textContent = `次季（日） ${q2s.toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit'})} ~ ${q2e.toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit'})}`;

  const sun1 = UI.sundaysBetween(q1s,q1e);
  const sun2 = UI.sundaysBetween(q2s,q2e);
  qs('#k_total').textContent = String(sun1.length + sun2.length);

  const { schedule, holiday, src } = await loadData();
  qs('#srcLabel').textContent = src;

  const scheduleMap = new Map(schedule.filter(s => s.status==='已排').map(s => [s.date, s]));
  const avoidSet = computeAvoid(holiday, schedule);

  qs('#k_q1').textContent = String(sun1.filter(d => scheduleMap.has(d)).length);
  qs('#k_q2').textContent = String(sun2.filter(d => scheduleMap.has(d)).length);
  qs('#k_avoid').textContent = String(new Set([...sun1,...sun2].filter(d => avoidSet.has(d))).size);

  renderQuarter(qs('#q1List'), sun1, scheduleMap, avoidSet);
  renderQuarter(qs('#q2List'), sun2, scheduleMap, avoidSet);

  const avoidList = [...new Set([...sun1, ...sun2].filter(d=>avoidSet.has(d)))]
      .map(d => UI.md(d)).join('、');
  qs('#avoidList').textContent = avoidList || '（本雙季無需避開的週日）';
}

// 事件綁定（確定綁好）
document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch(err => alert('讀取失敗：' + err.message));

  // PWA
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; });
  qs('#btnInstall').addEventListener('click', () => { if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; } });

  qs('#btnReload').addEventListener('click', () => location.reload());
  qs('#btnAvoid').addEventListener('click', () => document.getElementById('avoidDlg').showModal());

  qs('#btnEdit').addEventListener('click', () => {
    const todayISO = new Date().toISOString().slice(0,10);
    qs('#f_date').value = todayISO;
    qs('#f_league').value = '海客聯盟';
    qs('#f_status').value = '已排';
    qs('#f_note').value = '';
    document.getElementById('editDlg').showModal();
  });

  qs('#btnSave').addEventListener('click', async (ev) => {
    ev.preventDefault();
    const payload = {
      date: qs('#f_date').value,
      league: qs('#f_league').value,
      status: qs('#f_status').value,
      note: qs('#f_note').value
    };
    if (new Date(payload.date).getDay() !== 0) { alert('請選擇「星期日」日期。'); return; }

    try{
      const ret = await Cloud.postSchedule(payload);
      if(!ret.ok){ throw new Error(ret.error || '寫入失敗'); }
      alert(ret.local ? '✅ 已寫入本機（測試）' : '✅ 已寫入雲端表格');
      location.reload();
    }catch(e){
      alert('寫入失敗：' + e.message + '\n請檢查 js/cloud.js 的 APPS_SCRIPT_URL 與權限（Anyone）。');
    }
  });
});
