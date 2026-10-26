const storageKey='boundary-atlas-settings-v1';
export const defaults=Object.freeze({placeNames:true,hoverInfo:true,countryNames:true,countryLanguage:'both',labelSize:'standard',placeHeadingSize:36,motion:'system',legacyStyling:false,projection:'mercator'});
export function validateSettings(value){
 const result={...defaults};
 if(!value||typeof value!=='object')return result;
 for(const key of ['placeNames','countryNames','legacyStyling','hoverInfo'])if(typeof value[key]==='boolean')result[key]=value[key];
 for(const [key,values]of Object.entries({countryLanguage:['en','local','both'],labelSize:['standard','large'],motion:['system','reduce'],projection:['mercator','globe']}))if(values.includes(value[key]))result[key]=value[key];
 if(typeof value.placeHeadingSize==='number'&&Number.isFinite(value.placeHeadingSize))result.placeHeadingSize=Math.max(24,Math.min(48,Math.round(value.placeHeadingSize)));
 return result;
}
let storageAvailable=true,settings;try{const saved=JSON.parse(localStorage.getItem(storageKey));settings=validateSettings(saved);if(!saved?.projection&&localStorage.getItem('boundary-atlas-globe-v1')==='true')settings.projection='globe';}catch{storageAvailable=false;settings={...defaults};}
export const getSettings=()=>({...settings});
export const prefersReducedMotion=()=>settings.motion==='reduce'||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
function apply(){
 const root=globalThis.document?.documentElement;if(!root)return;
 root.toggleAttribute('data-hide-place-names',!settings.placeNames);root.toggleAttribute('data-hide-country-names',!settings.countryNames);root.dataset.labelSize=settings.labelSize;root.style.setProperty('--place-heading-size',settings.placeHeadingSize+'px');root.toggleAttribute('data-reduce-motion',prefersReducedMotion());
}
let syncState='guest';
export function setSettingsSyncState(value){syncState=value;globalThis.dispatchEvent?.(new Event('atlas-settings-sync'));}
function savedLabel(){return syncState==='synced'?'Synced with your account':syncState==='loading'?'Syncing with your account…':syncState==='saving'?'Saving to your account…':syncState==='offline'?(storageAvailable?'Saved on this device · sync pending':'Sync pending · keep this tab open'):storageAvailable?'Saved on this device':'Applies to this tab';}
export function setSettings(value,{source='local'}={}){settings=validateSettings({...settings,...value});try{localStorage.setItem(storageKey,JSON.stringify(settings));storageAvailable=true;}catch{storageAvailable=false;}apply();globalThis.dispatchEvent?.(new CustomEvent('atlas-settings-change',{detail:{source}}));}
apply();globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener('change',apply);
globalThis.addEventListener?.('storage',event=>{if(event.key!==storageKey)return;try{settings=validateSettings(JSON.parse(event.newValue));}catch{settings={...defaults};}apply();globalThis.dispatchEvent(new CustomEvent('atlas-settings-change',{detail:{source:'storage'}}));});

export function mountSettings({refreshLabels,refreshStyling=()=>{},setProjection,getProjection}){
 const trigger=document.getElementById('settings-open'),dialog=document.createElement('dialog');dialog.id='atlas-settings';dialog.setAttribute('aria-labelledby','settings-title');
 dialog.innerHTML=`<header class="settings-heading"><div><h2 id="settings-title">Settings</h2></div><button id="settings-close" type="button" aria-label="Close settings" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
 <div class="settings-content"><fieldset><legend>Map labels</legend>
 <label class="settings-row" for="settings-place-names"><span><strong>Place names</strong><small>Subdivision and settlement labels</small></span><input id="settings-place-names" type="checkbox" role="switch" data-setting="placeNames"></label>
 <label class="settings-row" for="settings-country-names"><span><strong>Country names</strong><small>Names on the surrounding map</small></span><input id="settings-country-names" type="checkbox" role="switch" data-setting="countryNames"></label>
 <label class="settings-field" for="settings-country-language">Country-label language<select id="settings-country-language" data-setting="countryLanguage"><option value="both">English + local language</option><option value="en">English</option><option value="local">Local language</option></select></label>
 <label class="settings-field" for="settings-label-size">Label size<select id="settings-label-size" data-setting="labelSize"><option value="standard">Standard</option><option value="large">Large</option></select></label></fieldset>
 <fieldset><legend>Reading</legend>
 <div class="settings-slider"><label for="settings-heading-size">Place heading size<output id="settings-heading-size-value" for="settings-heading-size" aria-hidden="true">36 px</output></label><small id="settings-heading-size-description">English name in the side panel</small><input id="settings-heading-size" type="range" min="24" max="48" step="1" value="36" data-setting="placeHeadingSize" aria-describedby="settings-heading-size-description"></div></fieldset>
 <fieldset><legend>Map &amp; movement</legend>
 <label class="settings-row" for="settings-hover-info"><span><strong>Place info on hover</strong><small>Show names and details beside the cursor</small></span><input id="settings-hover-info" type="checkbox" role="switch" data-setting="hoverInfo"></label>
 <label class="settings-row" for="settings-legacy-styling"><span><strong>Legacy styling</strong><small>Individual colors for Chinese provinces</small></span><input id="settings-legacy-styling" type="checkbox" role="switch" data-setting="legacyStyling"></label>
 <label class="settings-field" for="settings-projection">Map view<select id="settings-projection" data-setting="projection"><option value="mercator">Flat map</option><option value="globe">Globe</option></select></label>
 <label class="settings-field" for="settings-motion">Motion<select id="settings-motion" data-setting="motion"><option value="system">Use device setting</option><option value="reduce">Reduce motion</option></select></label></fieldset></div>
 <footer class="settings-footer"><span role="status" aria-live="polite">Saved on this device</span><button id="settings-reset" type="button">Reset settings</button></footer>`;
 document.body.append(dialog);
 const fields=[...dialog.querySelectorAll('[data-setting]')],projection=dialog.querySelector('#settings-projection');
 function sync(){dialog.querySelector(".settings-footer span").textContent=savedLabel();const value=getSettings();for(const input of fields){const key=input.dataset.setting;if(input.type==='checkbox')input.checked=value[key];else if(input.value!==String(value[key]))input.value=value[key];}dialog.querySelector('#settings-heading-size-value').textContent=value.placeHeadingSize+' px';dialog.querySelector('#settings-heading-size').setAttribute('aria-valuetext',value.placeHeadingSize+' pixels');projection.disabled=document.getElementById("globe-view").disabled;const next=getProjection();if(projection.value!==next)projection.value=next;}
 for(const field of fields)field.addEventListener(field.type==='range'?'input':'change',()=>setSettings({[field.dataset.setting]:field.type==='checkbox'?field.checked:field.type==='range'?Number(field.value):field.value}));

 trigger.onclick=()=>{if(dialog.open)return;if(!document.getElementById('country-menu').hidden)document.getElementById('country-switch').click();sync();(document.fullscreenElement||document.body).append(dialog);dialog.showModal();trigger.setAttribute('aria-expanded','true');};
 dialog.querySelector('#settings-close').onclick=()=>dialog.close();
 dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button,input,select,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.querySelector('#settings-reset').onclick=()=>{setSettings(defaults);sync();};
 let applied=getSettings();globalThis.addEventListener('atlas-settings-change',()=>{const next=getSettings(),previous=applied;applied=next;if(next.projection!==previous.projection)setProjection(next.projection);sync();if(['placeNames','countryNames','countryLanguage','labelSize'].some(key=>next[key]!==previous[key]))refreshLabels();if(next.legacyStyling!==previous.legacyStyling)refreshStyling();applied=next;});
 new MutationObserver(()=>{if(dialog.open)sync();}).observe(document.getElementById('globe-view'),{attributes:true,attributeFilter:['aria-pressed','disabled']});
 globalThis.addEventListener('atlas-settings-sync',sync);setProjection(getSettings().projection);sync();return{dialog};
}
