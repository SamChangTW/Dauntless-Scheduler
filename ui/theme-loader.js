/* TSAA Theme Loader: reads theme JSON and applies CSS variables */
(function(){
  const THEME_CLASS_PREFIX = 'theme-';
  const mapClassToKey = {
    'theme-scheduler': 'scheduler_midnight_blue'
  };

  async function loadTheme() {
    try {
      const url = (window.TSAA_THEME_URL || 'ui/tsaa_theme.json');
      const res = await fetch(url, {cache: 'no-cache'});
      const json = await res.json();

      const bodyClass = Array.from(document.body.classList).find(c=>c.startsWith(THEME_CLASS_PREFIX));
      const key = mapClassToKey[bodyClass] || bodyClass?.replace(THEME_CLASS_PREFIX,'') || 'scheduler_midnight_blue';
      const theme = json[key] || json['scheduler_midnight_blue'] || json['scheduler'];
      if (!theme) return;

      applyTheme(theme);
    } catch(e){
      // fail silently to avoid disrupting app logic
      console.warn('TSAA theme load failed', e);
    }
  }

  function applyTheme(t){
    const r = document.documentElement;
    r.style.setProperty('--tsaa-color-primary', t['color-primary']);
    r.style.setProperty('--tsaa-color-secondary', t['color-secondary']);
    r.style.setProperty('--tsaa-color-background', t['color-background']);
    r.style.setProperty('--tsaa-color-surface', t['color-surface']);
    r.style.setProperty('--tsaa-color-border', t['color-border']);
    r.style.setProperty('--tsaa-color-text', t['color-text']);
    r.style.setProperty('--tsaa-color-accent', t['color-accent']);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTheme);
  } else {
    loadTheme();
  }
})();
