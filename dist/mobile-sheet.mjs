// Phones: the visible sidebar is a bottom sheet over a full-screen map (styles in
// mobile-sheet.css). Three heights: peek (search and tabs), half and full. It opens
// to half when a region is selected or a tab is chosen, to full for search, and
// tucks back to peek when the map is panned. Desktop layouts are untouched.
const query = matchMedia('(max-width: 760px)');
const root = document.documentElement;
const states = ['peek', 'half', 'full'];
let state = 'peek', drag = null;

const visibleSidebar = () => [...document.querySelectorAll('aside.sidebar')].find(a => !a.hidden && getComputedStyle(a).display !== 'none');
function heights() {
  const aside = visibleSidebar(), tools = aside?.querySelector('.sidebar-tools'), handle = aside?.querySelector('.sheet-handle');
  const peek = Math.round((handle?.offsetHeight || 26) + (tools?.offsetHeight || 120) + 14);
  const full = Math.max(peek, innerHeight - 72);
  return {peek, half: Math.min(full, Math.max(peek, Math.round(innerHeight * .48))), full};
}
function ensureHandle(aside) {
  if (!aside || aside.querySelector(':scope > .sheet-handle')) return;
  const handle = document.createElement('button');
  handle.type = 'button'; handle.className = 'sheet-handle';
  aside.prepend(handle);
}
function apply(next, px) {
  if (!query.matches) return;
  state = next;
  document.querySelectorAll('aside.sidebar').forEach(ensureHandle);
  root.dataset.sheet = next;
  root.style.setProperty('--sheet-height', (px ?? heights()[next]) + 'px');
  for (const handle of document.querySelectorAll('.sheet-handle')) {
    handle.setAttribute('aria-expanded', String(next !== 'peek'));
    handle.setAttribute('aria-label', next === 'full' ? 'Collapse panel' : 'Expand panel');
  }
}
const atLeast = target => { if (states.indexOf(state) < states.indexOf(target)) apply(target); };

// Drag the handle or the search/tab strip; a tap on the handle steps through heights.
document.addEventListener('pointerdown', event => {
  if (!query.matches) return;
  const aside = event.target.closest?.('aside.sidebar'), onHandle = !!event.target.closest('.sheet-handle');
  if (!aside || !(onHandle || event.target.closest('.sidebar-tools')) || (!onHandle && event.target.closest('input, button, a, select, label'))) return;
  drag = {y: event.clientY, start: heights()[state], moved: 0, onHandle, last: event.clientY, time: performance.now(), velocity: 0};
  root.dataset.sheetDragging = '';
});
addEventListener('pointermove', event => {
  if (!drag) return;
  const {peek, full} = heights(), now = performance.now();
  drag.moved = Math.max(drag.moved, Math.abs(event.clientY - drag.y));
  drag.velocity = (drag.last - event.clientY) / Math.max(1, now - drag.time); drag.last = event.clientY; drag.time = now;
  if (drag.moved > 6) apply(state, Math.min(full, Math.max(peek, drag.start + drag.y - event.clientY)));
});
addEventListener('pointerup', () => {
  if (!drag) return;
  const current = drag; drag = null; delete root.dataset.sheetDragging;
  if (current.moved <= 6) { if (current.onHandle) apply(states[(states.indexOf(state) + 1) % states.length]); return; }
  const h = heights(), height = parseFloat(root.style.getPropertyValue('--sheet-height'));
  // A flick moves one step in its direction; otherwise snap to the nearest height.
  if (Math.abs(current.velocity) > .5) { const i = states.indexOf(state) + (current.velocity > 0 ? 1 : -1); apply(states[Math.max(0, Math.min(2, i))]); }
  else apply(states.reduce((best, s) => Math.abs(h[s] - height) < Math.abs(h[best] - height) ? s : best, 'peek'));
});
addEventListener('pointercancel', () => { if (drag) { drag = null; delete root.dataset.sheetDragging; apply(state); } });

// Search fills the screen; choosing a tab opens the sheet.
document.addEventListener('focusin', event => { if (query.matches && event.target.matches?.('aside.sidebar .sidebar-tools input')) apply('full'); });
document.addEventListener('click', event => { if (query.matches && event.target.closest?.('aside.sidebar .panel-tabs button')) atLeast('half'); });

// Selecting a region opens the sheet to half; clearing it tucks the sheet away.
const selected = () => { const crumb = document.getElementById('breadcrumb-region'); return !!crumb && !crumb.hidden; };
let wasSelected = false;
new MutationObserver(records => {
  if (!query.matches) return;
  const nowSelected = selected();
  const regionTab = records.some(r => r.attributeName === 'aria-pressed' && r.target.getAttribute('aria-pressed') === 'true' && /tab-(explore|quiz)$/.test(r.target.id));
  if (nowSelected && !wasSelected || regionTab) atLeast('half');
  else if (!nowSelected && wasSelected && state === 'half') apply('peek');
  else if (records.some(r => r.attributeName === 'hidden' && r.target.matches?.('aside.sidebar'))) apply(state);
  wasSelected = nowSelected;
}).observe(document.body, {subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-pressed']});
// The startup panel gives way to the country's own sidebar; measure that one.
// A new country starts with the sheet tucked away.
new MutationObserver(records => apply(records.some(r => r.attributeName === 'data-atlas') ? 'peek' : state)).observe(root, {attributes: true, attributeFilter: ['data-starting', 'data-atlas']});

// Panning the map tucks the sheet down so the map is in view.
let mapTouch = null;
document.addEventListener('pointerdown', event => { mapTouch = query.matches && event.target.closest?.('#map') ? {x: event.clientX, y: event.clientY} : null; });
addEventListener('pointermove', event => {
  if (!mapTouch || state === 'peek' || Math.hypot(event.clientX - mapTouch.x, event.clientY - mapTouch.y) < 12) return;
  mapTouch = null; apply('peek');
});

// The breadcrumb row sits below the header pill, however tall the pill and the
// status bar make it on a given phone.
function placeBelowHeader() {
  const parts = [...document.querySelectorAll('.site-header > *')].map(el => el.getBoundingClientRect()).filter(r => r.height);
  if (query.matches && parts.length) root.style.setProperty('--header-bottom', Math.round(Math.max(...parts.map(r => r.bottom))) + 'px');
}
new ResizeObserver(placeBelowHeader).observe(document.querySelector('.site-header'));
addEventListener('resize', () => { placeBelowHeader(); apply(state); });
query.addEventListener('change', () => {
  if (query.matches) apply(state);
  else { delete root.dataset.sheet; root.style.removeProperty('--sheet-height'); }
});
if (query.matches) apply('peek');

// Camera flights keep the selected region above the half-open sheet.
export function navigationInset() { return query.matches ? heights().half + 16 : 0; }
