(function(){
  const box = document.createElement('div');
  box.style.background = 'rgba(12,16,22,.92)';
  box.style.border = '1px solid #394150';
  box.style.color = '#E5E7EB';
  box.style.borderRadius = '12px';
  box.style.padding = '10px 12px';
  box.style.minWidth = '260px';
  box.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  box.innerHTML = '<div style="font-weight:800;margin-bottom:6px">Friday Console</div><div id="fc-body" style="font-size:12px;line-height:1.4"></div>';
  document.getElementById('friday-console').appendChild(box);
  const log = (msg)=>{ document.getElementById('fc-body').innerHTML += msg + '<br/>'; };
  window.FC = { log };
  FC.log('v2.7 ready');
})();