// ---- CloudLink Fix v2.7.1 ----
const CONFIG={
  SHEET_URL_SCHEDULE_CSV:"https://docs.google.com/spreadsheets/d/e/2PACX-1vQP5RM3eI5u486SbWyReQdEbBWMAsnsLKRwlL_FeFq8ejbV5b7JEgV2Wzf-mKref8YQhMXf4lXLvBAh/pub?output=csv",
  SHEET_URL_HOLIDAY_CSV:"https://docs.google.com/spreadsheets/d/e/2PACX-1vQPWkSisyPrrYRbZirLg6Xc9v1Z7eQHeO-aBNYbopP2pfqj5PAkqhznaYnmJzQh2H1PRnL_-GeMThYT/pub?output=csv",
  API_URL:"https://script.google.com/macros/s/AKfycbxKec1QMXr3KOnds49rTD31GkCMyg0ipJCf2uRSWt_hpFYXXPAfJYnMPqnb7TkAEdpPsg/exec"
};
const qs=s=>document.querySelector(s);const log=m=>{qs('#console').textContent+=`\n${m}`;}
const z=n=>String(n).padStart(2,'0');const ymd=d=>`${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
function parseCSV(t){const L=t.trim().split(/\r?\n/);const H=L.shift().split(",");const id=n=>H.findIndex(h=>h.toLowerCase().trim()===n.toLowerCase());const iD=id("date"),iL=id("league"),iS=id("status"),iN=id("notes")>=0?id("notes"):id("note");return L.map(r=>{const p=r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);const v=c=>(c>=0&&p[c]!==undefined)?p[c].replace(/^"|"$/g,""):"";return{date:v(iD),league:v(iL),status:v(iS),note:v(iN)}})}
async function fetchCSV(u){const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw new Error("CSV "+r.status);return parseCSV(await r.text())}
function calcSundaysTwoQuarters(){const t=new Date();const all=[];const s=new Date(t);s.setDate(s.getDate()-((s.getDay()+6)%7));for(let i=0;i<26;i++){const d=new Date(s);d.setDate(s.getDate()+i*7);all.push(ymd(d))}return all}
function renderSlots(all,b,hol){const A=qs('#listThis'),B=qs('#listNext');A.innerHTML="";B.innerHTML="";const half=Math.ceil(all.length/2);const m=new Set(b);const a=new Set(hol);const mk=d=>{const div=document.createElement('div');div.className="slot";div.textContent=d;if(m.has(d))div.style.borderColor="#2d5f3c";if(a.has(d))div.style.borderColor="#5f2d2d";return div};all.slice(0,half).forEach(d=>A.appendChild(mk(d)));all.slice(half).forEach(d=>B.appendChild(mk(d)));qs('#weeksThis').textContent=String(half);qs('#countThis').textContent=String(b.filter(d=>all.indexOf(d)<half).length);qs('#countNext').textContent=String(b.filter(d=>all.indexOf(d)>=half).length);qs('#countAvoid').textContent=String(hol.length)}
async function bootstrap(){log("Bootstrap start");try{log("fetch schedule CSV…");const s=await fetchCSV(CONFIG.SHEET_URL_SCHEDULE_CSV);log("fetch holiday CSV…");const h=await fetchCSV(CONFIG.SHEET_URL_HOLIDAY_CSV);const sd=s.map(r=>r.date).filter(Boolean);const hd=h.map(r=>r.date).filter(Boolean);const all=calcSundaysTwoQuarters();renderSlots(all,sd,hd);log("✓ 系統初始化完成")}catch(e){log("初始化失敗: "+e.message)}}
async function submitForm() {
  const date = qs('#f_date').value.trim();
  const league = qs('#f_league').value.trim();
  const opponent = qs('#f_opponent').value.trim();
  const status = qs('#f_status').value.trim();

  const payload = { date, league, opponent, status };
  log("正在送出至 Google Sheet…");

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status === "success") {
      alert("✅ 已成功寫入 Google Sheet！");
    } else {
      alert("⚠️ 寫入失敗：" + (data.message || "未知錯誤"));
    }
  } catch (err) {
    alert("❌ 連線錯誤：" + err.message);
  }
}

addEventListener("DOMContentLoaded",()=>{bootstrap();qs("#btnReload").addEventListener("click",()=>location.reload());const dlg=qs("#dlgForm");qs("#btnOpenForm").addEventListener("click",()=>dlg.showModal());qs("#btnClose").addEventListener("click",()=>dlg.close());qs("#btnSubmit").addEventListener("click",e=>{e.preventDefault();submitForm()});});
