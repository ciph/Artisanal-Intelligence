(() => {
  'use strict';

  const browser = document.querySelector('.skills-browser');
  const list = browser?.querySelector('.skill-tabs');
  if (!list) return;

  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  // Keep all service descriptions readable if the markup cannot be enhanced.
  if (!tabs.length || panels.some(panel => !panel || !browser.contains(panel))) return;

  const mobile = window.matchMedia('(max-width: 767px)');

  function select(index, focus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus({ preventScroll: true });
    if (mobile.matches && focus) {
      tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }

  function updateOrientation() {
    list.setAttribute('aria-orientation', mobile.matches ? 'horizontal' : 'vertical');
  }

  function selectFromHash() {
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    const index = panels.findIndex(panel => target && panel.contains(target));
    if (index >= 0) select(index);
  }

  tabs.forEach((tab, index) => {
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      const nextKey = mobile.matches ? 'ArrowRight' : 'ArrowDown';
      const previousKey = mobile.matches ? 'ArrowLeft' : 'ArrowUp';
      let next;
      if (event.key === nextKey) next = (index + 1) % tabs.length;
      else if (event.key === previousKey) next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(next, true);
    });
  });

  select(0);
  updateOrientation();
  selectFromHash();
  mobile.addEventListener('change', updateOrientation);
  window.addEventListener('hashchange', selectFromHash);
  browser.classList.add('is-interactive');
  list.hidden = false;
})();
