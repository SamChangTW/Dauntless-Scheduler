function fmtISO(d){ return new Date(d).toISOString().slice(0,10); }
function md(d){ const x=new Date(d); return x.toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit'}); }
function sundaysBetween(start,end){
  const out=[]; let d=new Date(start);
  d.setDate(d.getDate()+((7-d.getDay())%7));
  while(d<=end){ out.push(fmtISO(d)); d.setDate(d.getDate()+7); }
  return out;
}
function qRangesFromToday(){
  const t=new Date(); const y=t.getFullYear(); const m=t.getMonth(); const q=Math.floor(m/3);
  const range=(Y,Q)=>[new Date(Y,Q*3,1), new Date(Y,Q*3+3,0)];
  const [q1s,q1e]=range(y,q); const nq=(q+1)%4; const y2=nq<q?y+1:y; const [q2s,q2e]=range(y2,nq);
  return {q1s,q1e,q2s,q2e};
}
function slotHTML(d, booked, avoid){
  const tags=[];
  if(booked) tags.push('<span class="tag green">已排</span>');
  if(avoid)  tags.push('<span class="tag red">避開</span>');
  return `
    <div class="slot">
      <div class="left">
        <span class="dot"></span>
        <div>
          <div class="date">${md(d)}</div>
          <div class="range">${d}</div>
        </div>
      </div>
      <div class="tags">${tags.join('')}</div>
    </div>`;
}
window.UI = { fmtISO, md, sundaysBetween, qRangesFromToday, slotHTML };
