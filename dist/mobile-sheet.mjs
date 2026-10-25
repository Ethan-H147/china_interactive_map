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
  drag = {y: event.clientY, start: heights()[state], moved: 0, onHandle, last: event.clientY, time: event.timeStamp, velocity: 0};
  root.dataset.sheetDragging = '';
});
addEventListener('pointermove', event => {
  if (!drag) return;
  // Speed comes from the input events' own timestamps, so a slow device that handles
  // events late still measures a flick at the speed the finger moved.
  const {peek, full} = heights(), now = event.timeStamp;
  drag.moved = Math.max(drag.moved, Math.abs(event.clientY - drag.y));
  drag.velocity = (drag.last - event.clientY) / Math.max(1, now - drag.time); drag.last = event.clientY; drag.time = now;
  if (drag.moved > 6) apply(state, Math.min(full, Math.max(peek, drag.start + drag.y - event.clientY)));
});
addEventListener('pointerup', () => {
  if (!drag) return;
  const current = drag; drag = null; delete root.dataset.sheetDragging;
  if (current.moved <= 6) { if (current.onHandle) apply(states[(states.indexOf(state) + 1) % states.length]); return; }
  const h = heights(), height = parseFloat(root.style.getPropertyValue('--sheet-height'));
  // Snap to the height nearest where the release is heading (a short throw of the current
  // speed), so a quick flick moves at least one step and a fast long drag lands where it ends.
  const nearest = target => states.reduce((best, s) => Math.abs(h[s] - target) < Math.abs(h[best] - target) ? s : best, 'peek');
  let next = nearest(height + current.velocity * 200);
  if (Math.abs(current.velocity) > .5 && next === state) { const i = states.indexOf(state) + (current.velocity > 0 ? 1 : -1); next = states[Math.max(0, Math.min(2, i))]; }
  apply(next);
});
// Keyboard access: Enter or Space on the focused handle steps through the heights, like a
// tap. The keys are handled directly (and their default click suppressed), so a touch tap,
// which pointerup already handles, can never count twice.
document.addEventListener('keydown', event => {
  if (!query.matches || (event.key !== 'Enter' && event.key !== ' ') || !event.target.closest?.('.sheet-handle')) return;
  event.preventDefault();
  if (!event.repeat) apply(states[(states.indexOf(state) + 1) % states.length]);
});
document.addEventListener('keyup', event => { if (query.matches && event.key === ' ' && event.target.closest?.('.sheet-handle')) event.preventDefault(); });
addEventListener('pointercancel', () => { if (drag) { drag = null; delete root.dataset.sheetDragging; apply(state); } });

// Search fills the screen; choosing a tab opens the sheet.
document.addEventListener('focusin', event => { if (query.matches && event.target.matches?.('aside.sidebar .sidebar-tools input')) apply('full'); });
document.addEventListener('click', event => { if (query.matches && event.target.closest?.('aside.sidebar .panel-tabs button')) atLeast('half'); });

// Selecting a region opens the sheet to half; clearing it tucks the sheet away.
const selected = () => { const crumb = document.getElementById('breadcrumb-region'); return !!crumb && !crumb.hidden; };
let wasSelected = false;
// Reselecting the same search result leaves the breadcrumb text unchanged.
document.addEventListener('click', event => {
  if (query.matches && state === 'full' && selected() && event.target.closest?.('aside.sidebar .search-result')) apply('half');
});
new MutationObserver(records => {
  if (!query.matches) return;
  const nowSelected = selected();
  const regionTab = records.some(r => r.attributeName === 'aria-pressed' && r.target.getAttribute('aria-pressed') === 'true' && /tab-(explore|quiz)$/.test(r.target.id));
  if (nowSelected && !wasSelected || regionTab) atLeast('half');
  else if (!nowSelected && wasSelected && state === 'half') apply('peek');
  else if (records.some(r => r.attributeName === 'hidden' && r.target.matches?.('aside.sidebar'))) apply(state);
  wasSelected = nowSelected;
}).observe(document.body, {subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-pressed']});
// Choosing a place (from search, a list or the map) shows it: a full sheet comes down to
// half, so the selected region is visible above it.
let crumbText='';
const crumb=document.getElementById('breadcrumb-region');
if(crumb)new MutationObserver(()=>{
 if(!query.matches)return;
 const text=crumb.hidden?'':crumb.textContent;
 if(text&&text!==crumbText){if(state==='full')apply('half');else atLeast('half');}
 crumbText=text;
}).observe(crumb,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
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
// Three or more levels do not fit beside the breadcrumb on a phone: the toggle shows
// the current level, tapping it lists every level vertically, and a choice closes it.
const levelToggle = document.querySelector('.map-mode');
const levels = () => [...levelToggle.querySelectorAll('button')].filter(b => b.id !== 'mode-lock' && !b.hidden);
function syncLevels() {
  if (!levelToggle) return;
  const collapse = query.matches && (levels().length > 2 || !document.getElementById('map-view')?.hidden && levels().length > 1);
  levelToggle.toggleAttribute('data-collapsed-levels', collapse);
  if (!collapse) levelToggle.removeAttribute('data-open');
}
document.addEventListener('click', event => {
  const button = event.target.closest?.('.map-mode[data-collapsed-levels] button');
  if (!button || button.id === 'mode-lock') return;
  if (levelToggle.hasAttribute('data-open')) { levelToggle.removeAttribute('data-open'); return; }
  event.preventDefault(); event.stopPropagation();
  levelToggle.setAttribute('data-open', '');
}, true);
document.addEventListener('pointerdown', event => { if (levelToggle?.hasAttribute('data-open') && !event.target.closest('.map-mode')) levelToggle.removeAttribute('data-open'); });
if (levelToggle) new MutationObserver(syncLevels).observe(document.getElementById('map-selection')||levelToggle, {subtree: true, attributes: true, attributeFilter: ['hidden']});
query.addEventListener('change', syncLevels);
syncLevels();

addEventListener('resize', () => { placeBelowHeader(); apply(state); });
query.addEventListener('change', () => {
  if (query.matches) apply(state);
  else { delete root.dataset.sheet; root.style.removeProperty('--sheet-height'); }
});
if (query.matches) apply('peek');

// Camera flights keep the selected region above the half-open sheet.
export function navigationInset() { return query.matches ? heights().half + 16 : 0; }
export function expand(){if(query.matches)apply('half');}

// A map quiz can make room for its inset maps while its question stays over the map.
export async function collapse(){
 if(!query.matches||state==='peek')return;
 apply('peek');
 if(!(globalThis.AtlasSettings?.prefersReducedMotion?.()??matchMedia('(prefers-reduced-motion: reduce)').matches))await new Promise(resolve=>setTimeout(resolve,300));
}

// Keep multi-touch outside the map from scaling the browser viewport.
// Touch.target keeps the gesture's starting surface even if a finger moves elsewhere.
const mapCanvasTouch = target => !!target?.closest?.('#map canvas.maplibregl-canvas');
let screenTouches = 0, uiPinch = false;
function guardPagePinch(event) {
  screenTouches = event.touches.length;
  if (screenTouches < 2) { uiPinch = false; return; }
  uiPinch = ![...event.touches].every(touch => mapCanvasTouch(touch.target));
  if (uiPinch && event.cancelable) event.preventDefault();
}
for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
  document.addEventListener(type, guardPagePinch, {capture: true, passive: false});
}
// Safari also emits GestureEvents. Desktop trackpad gestures keep their existing behavior.
for (const type of ['gesturestart', 'gesturechange']) {
  document.addEventListener(type, event => {
    if (!matchMedia('(any-pointer: coarse)').matches && !screenTouches) return;
    if ((uiPinch || !mapCanvasTouch(event.target)) && event.cancelable) event.preventDefault();
  }, {capture: true, passive: false});
}
