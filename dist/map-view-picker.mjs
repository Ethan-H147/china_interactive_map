// The map view is independent of the administrative selection level.
let owner=null;
export function configureMapViewPicker({country,value,options,onChange,busy=false,thematic=value!==options[0].value}){
 const select=document.getElementById('map-view'),group=document.getElementById('map-selection');if(!select||!group)return;
 const signature=JSON.stringify(options);
 if(select.dataset.options!==signature){select.replaceChildren(...options.map(o=>new Option(o.label,o.value)));select.dataset.options=signature;}
 for(const b of group.querySelectorAll?.('.map-mode>button:not(#mode-lock)')||[]){if(b.hidden||!b.textContent)continue;b.dataset.viewShortLabel=b.textContent.split(' & ')[0];b.setAttribute('aria-label',b.textContent);}
 owner=country;select.hidden=false;select.value=value;select.setAttribute('aria-busy',String(busy));
 const label=options.find(o=>o.value===value)?.label||'Administrative';
 select.title='Map view: '+label;select.setAttribute('aria-label','Map view: '+label);
 if(thematic)group.dataset.thematic='true';else delete group.dataset.thematic;
 select.onchange=()=>onChange(select.value);
}
export function clearMapViewPicker(country){
 if(owner!==country)return;owner=null;
 const select=document.getElementById('map-view'),group=document.getElementById('map-selection');
 if(select){select.hidden=true;select.onchange=null;select.replaceChildren();delete select.dataset.options;}
 if(group){delete group.dataset.thematic;for(const b of group.querySelectorAll?.('[data-view-short-label]')||[]){delete b.dataset.viewShortLabel;b.removeAttribute('aria-label');}}
}
