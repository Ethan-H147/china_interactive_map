import {liftAccent} from './appearance-paint.mjs';
const visible=e=>!!e&&e.checkVisibility({visibilityProperty:true})&&!e.closest('[hidden],[inert]');
const editable=e=>e?.closest('input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox]');
export function installAtlasComfort(map){
 const root=document.documentElement,prefs=globalThis.AtlasComfort;if(!prefs)return;
 let lastFocus,focused=false;
 function accent(){const mode=root.dataset.colorMode;root.dataset.colorMode='light';const base=getComputedStyle(document.body).getPropertyValue('--red').trim();root.style.setProperty('--night-accent',liftAccent(base));root.dataset.colorMode=mode;}
 const settings=document.querySelector('#atlas-settings .settings-content'),fields=document.createElement('fieldset');fields.className='comfort-fields';fields.innerHTML='<legend>Appearance &amp; keyboard</legend><label>Appearance<select data-comfort="appearance"><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Quiz colors<select data-comfort="palette"><option value="standard">Standard</option><option value="accessible">Blue &amp; orange</option></select></label><div class="comfort-palette-preview" aria-label="Quiz color preview"><span><i aria-hidden="true"></i>Correct</span><span><i aria-hidden="true"></i>Incorrect</span><span><i aria-hidden="true"></i>Highlighted</span></div><label>Keyboard shortcuts<select data-comfort="shortcuts"><option value="true">Enabled</option><option value="false">Disabled</option></select></label><button type="button" class="comfort-help-button">Keyboard shortcuts</button>';const note=document.createElement('p');note.className='quiz-note';note.textContent='These preferences apply on this device.';fields.append(note);settings?.prepend(fields);
 const sync=()=>{accent();for(const field of fields.querySelectorAll('select'))field.value=String(prefs.get()[field.dataset.comfort]);};
 for(const field of fields.querySelectorAll('select'))field.onchange=()=>prefs.set({[field.dataset.comfort]:field.dataset.comfort==='shortcuts'?field.value==='true':field.value});
 document.getElementById('settings-reset')?.addEventListener('click',()=>prefs.clear());
 addEventListener('atlas-appearance-change',sync);new MutationObserver(()=>{accent();if(focused)focusMap(false);}).observe(document.body,{attributes:true,attributeFilter:['data-atlas']});sync();
 const command=document.createElement('dialog');command.className='atlas-command';command.setAttribute('aria-labelledby','atlas-command-title');command.innerHTML='<header><h2 id="atlas-command-title">Go anywhere</h2><button aria-label="Close quick commands" type="button">×</button></header><input aria-label="Search countries and commands" placeholder="A country, or an action…" autocomplete="off"><div class="atlas-command-results"></div><div class="atlas-shortcuts" hidden></div>';document.body.append(command);
 const input=command.querySelector('input'),results=command.querySelector('.atlas-command-results'),help=command.querySelector('.atlas-shortcuts');
 const bindings=[['1 / 2 / 3','Choose a visible map level'],['/','Find a place'],['Ctrl / ⌘ K','Countries and quick commands'],['F','Focus the map for arrow-key panning'],['M','Toggle focus-map view'],['D','Switch light / dark'],['?','Show these shortcuts'],['Esc','Close a menu or leave focus view']];
 for(const [keys,label]of bindings){const k=document.createElement('kbd'),s=document.createElement('span');k.textContent=keys;s.textContent=label;help.append(k,s);}
 globalThis.visualViewport?.addEventListener('resize',()=>{const input=document.activeElement;if(input?.matches('.sidebar [data-q=form] input'))requestAnimationFrame(()=>{if(document.activeElement===input)input.scrollIntoView({block:'nearest',behavior:'instant'});});});
 const exit=document.createElement('button');exit.className='atlas-focus-exit';exit.textContent='Exit focus view (M)';exit.hidden=true;document.getElementById('map-shell').append(exit);
 function focusMap(value=!focused){if(value&&document.querySelector('#map-shell[data-quiz=true]'))return;focused=value;root.toggleAttribute('data-map-focus',focused);exit.hidden=!focused;map.resize();if(focused)map.getCanvas().focus({preventScroll:true});}
 exit.onclick=()=>focusMap(false);
 function close(){command.close();}command.querySelector('header button').onclick=close;command.addEventListener('close',()=>lastFocus?.isConnected&&visible(lastFocus)&&lastFocus.focus({preventScroll:true}));command.addEventListener('click',e=>{if(e.target===command){const r=command.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 function open(showHelp=false){if(document.querySelector('dialog[open]')&&!command.open)return;lastFocus=document.activeElement;command.querySelector('h2').textContent=showHelp?'Keyboard shortcuts':'Go anywhere';help.hidden=!showHelp;input.hidden=results.hidden=showHelp;if(!command.open)(document.fullscreenElement||document.body).append(command),command.showModal();if(showHelp)command.querySelector('header button').focus();else{input.value='';renderCommands();input.focus();}}
 fields.querySelector('button').onclick=()=>{document.getElementById('atlas-settings').close();open(true);};
 const quizActive=()=>document.getElementById('map-shell')?.dataset.quiz==='true';
 function renderCommands(){results.replaceChildren();const q=input.value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim(),actions=[{label:'Switch light / dark',detail:'D',run:()=>prefs.set({appearance:root.dataset.colorMode==='dark'?'light':'dark'})},{label:'Focus map view',detail:'M',run:()=>focusMap()},{label:'Settings',detail:'',run:()=>document.getElementById('settings-open').click()},{label:'Keyboard shortcuts',detail:'?',run:()=>open(true)}];
 const countries=quizActive()?[]:Object.values(AtlasCountries.countries).filter(c=>c.quiz&&!c.snapshot).map(c=>({label:c.en,search:c.en+' '+c.local,detail:'Country',run:()=>{if(focused)focusMap(false);document.dispatchEvent(new CustomEvent('atlas-comfort-country',{detail:c.id}));}}));
 const choices=[...actions,...countries].filter(c=>(c.search||c.label).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().includes(q)).slice(0,10);
 for(const choice of choices){const b=document.createElement('button'),label=document.createElement('span'),detail=document.createElement('small');b.type='button';label.textContent=choice.label;detail.textContent=choice.detail;b.append(label,detail);b.onclick=()=>{close();choice.run();};results.append(b);}if(!choices.length){const p=document.createElement('p');p.className='atlas-command-empty';p.textContent='No matching countries or commands.';results.append(p);}}
 input.oninput=renderCommands;command.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){const buttons=[...results.querySelectorAll('button')];if(!buttons.length)return;e.preventDefault();const i=buttons.indexOf(document.activeElement);buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();}else if(e.key==='Enter'&&document.activeElement===input){e.preventDefault();results.querySelector('button')?.click();}});
 // Enhance only the focused search box; inactive sidebars stay parked and untouched.
 const searches=new WeakMap();let serial=0;
 function searchState(input){if(searches.has(input))return searches.get(input);const box=document.getElementById(input.id.replace(/-search$/,'-search-results'))||(input.id==='search'?document.getElementById('search-results'):null);if(!box)return null;
  const state={box,index:-1};searches.set(input,state);input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',box.id);box.setAttribute('role','listbox');
  const update=()=>{state.index=-1;input.removeAttribute('aria-activedescendant');input.setAttribute('aria-expanded',String(visible(box)));for(const b of box.querySelectorAll('button')){b.id||='atlas-search-option-'+(++serial);b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.classList.remove('keyboard-active');}};
  new MutationObserver(update).observe(box,{childList:true,attributes:true,attributeFilter:['hidden']});input.addEventListener('input',()=>{state.index=-1;queueMicrotask(update);});update();return state;
 }
 document.addEventListener('focusin',e=>{if(e.target.matches?.('.search-wrap input'))searchState(e.target);});
 document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.isComposing||e.altKey||e.repeat)return;
  const target=e.target;
  if(!e.ctrlKey&&!e.metaKey&&target.matches?.('.search-wrap input')&&['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key)){
   const state=searchState(target),buttons=state&&visible(state.box)?[...state.box.querySelectorAll('button:not(:disabled)')]:[];
   if(state&&buttons.length&&(e.key!=='Enter'||state.index>=0)){
    e.preventDefault();e.stopImmediatePropagation();
    if(e.key==='Escape'){target.value='';target.dispatchEvent(new Event('input',{bubbles:true}));return;}
    if(e.key==='Enter'){buttons[state.index]?.click();target.removeAttribute('aria-activedescendant');target.setAttribute('aria-expanded','false');return;}
    state.index=state.index<0?(e.key==='ArrowDown'?0:buttons.length-1):(state.index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
    buttons.forEach((b,i)=>{b.classList.toggle('keyboard-active',i===state.index);b.setAttribute('aria-selected',String(i===state.index));});target.setAttribute('aria-activedescendant',buttons[state.index].id);buttons[state.index].scrollIntoView({block:'nearest'});return;
   }
  }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&prefs.get().shortcuts){e.preventDefault();if(command.open)close();else if(!document.querySelector('dialog[open]'))open();return;}
  if(editable(target)||e.ctrlKey||e.metaKey||!prefs.get().shortcuts||document.querySelector('dialog[open]'))return;
  if(e.key==='Escape'&&focused){e.preventDefault();focusMap(false);return;}
  if(['1','2','3'].includes(e.key)&&!quizActive()){
   const group=document.querySelector('#map-selection .map-mode');if(!visible(group))return;const buttons=[...group.querySelectorAll('button:not(#mode-lock)')].filter(b=>!b.hidden&&b.textContent.trim());const button=buttons[Number(e.key)-1];if(button&&!button.disabled){e.preventDefault();button.click();}return;
  }
  if(e.key==='/'){const search=[...document.querySelectorAll('.sidebar:not([hidden]) .search-wrap input')].find(visible);if(search&&!quizActive()){e.preventDefault();search.focus();search.select();}return;}
  if(e.key==='?'){e.preventDefault();open(true);return;}
  if(e.key.toLowerCase()==='d'){e.preventDefault();prefs.set({appearance:root.dataset.colorMode==='dark'?'light':'dark'});return;}
  if(e.key.toLowerCase()==='m'&&!quizActive()){e.preventDefault();focusMap();return;}
  if(e.key.toLowerCase()==='f'){e.preventDefault();map.getCanvas().focus({preventScroll:true});}
 },true);
 // Expanding a quiz or country switch always restores the sidebar.
 new MutationObserver(()=>{if(focused&&quizActive())focusMap(false);}).observe(document.getElementById('map-shell'),{attributes:true,attributeFilter:['data-quiz']});
 addEventListener('atlas-country-change',()=>{if(focused)focusMap(false);});
}
