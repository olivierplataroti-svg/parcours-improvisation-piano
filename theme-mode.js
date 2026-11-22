(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || window.__pianoThemeMode) return;
  window.__pianoThemeMode = true;
  const app = script.dataset.pianoTheme;
  const key = 'piano-appearance-' + app;
  const root = document.documentElement;
  const href = new URL('./theme-mode.css?v=1', script.src).href;
  let mode = 'light';
  try { if (localStorage.getItem(key) === 'dark') mode = 'dark'; } catch (_) {}
  root.dataset.pianoTheme = app;
  root.dataset.theme = mode;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'piano-mode-toggle';
  button.id = 'piano-mode-toggle';
  function paint() {
    root.dataset.theme = mode;
    const label = mode === 'dark' ? 'Mode clair' : 'Mode sombre';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-pressed', String(mode === 'dark'));
    button.setAttribute('aria-label', 'Activer le ' + label.toLowerCase());
    button.title = 'Activer le ' + label.toLowerCase();
  }
  function mount() {
    if (!document.querySelector('link[data-piano-theme-style]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.pianoThemeStyle = 'true';
      document.head.appendChild(link);
    }
    const target = document.querySelector(app === 'dashboard' ? '.mast-inner' : app === 'harmony' ? '.topbar' : '.top-actions');
    if (target && button.parentElement !== target) target.appendChild(button);
  }
  button.addEventListener('click', () => {
    mode = mode === 'dark' ? 'light' : 'dark';
    paint();
    try { localStorage.setItem(key, mode); } catch (_) {}
  });
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    mode = event.newValue === 'dark' ? 'dark' : 'light';
    paint();
  });
  paint();
  function start() {
    mount();
    new MutationObserver(mount).observe(document.documentElement, {childList:true, subtree:true});
    new MutationObserver(() => {
      if (root.dataset.theme !== mode || root.dataset.pianoTheme !== app) {
        root.dataset.pianoTheme = app;
        paint();
      }
    }).observe(root, {attributes:true, attributeFilter:['data-theme','data-piano-theme']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
