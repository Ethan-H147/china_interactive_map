const key='china-atlas-saved-places-v1';
export function createPlaceTools(host){
  const $=id=>document.getElementById(id);
  let selected,stored=[];
  try{const data=JSON.parse(localStorage.getItem(key));if(Array.isArray(data))stored=[...new Set(data.filter(code=>host.get(code)))].slice(0,100);}catch{}
  function persist(){try{localStorage.setItem(key,JSON.stringify(stored));return true;}catch{return false;}}
  function render(){
    const list=$('saved-places-list');list.replaceChildren();
    if(!stored.length){const p=document.createElement('p');p.textContent='Save a place from its details panel to return to it here.';list.append(p);}
    for(const code of stored){
      const place=host.get(code);if(!place)continue;
      const row=document.createElement('div');row.className='saved-place';
      const visit=document.createElement('button');visit.type='button';visit.dataset.nav='';visit.textContent=place.name;visit.onclick=()=>host.select(code);
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove '+place.name+' from saved places');remove.onclick=()=>{stored=stored.filter(c=>c!==code);persist();render();};
      row.append(visit,remove);list.append(row);
    }
    const saved=stored.includes(selected);$('save-place').textContent=saved?'Saved':'Save place';$('save-place').setAttribute('aria-pressed',String(saved));
    host.controls();
  }
  $('save-place').onclick=()=>{
    if(!selected)return;
    const had=stored.includes(selected);stored=had?stored.filter(c=>c!==selected):[selected,...stored].slice(0,100);
    const saved=persist();render();$('place-action-status').hidden=false;
    $('place-action-status').textContent=saved?(had?'Removed from saved places.':'Saved in this browser.'):'Browser storage is unavailable. This list will last until you close the page.';
  };
  $('copy-place').onclick=async()=>{
    if(!selected)return;const url=new URL(location.href);url.hash='place='+encodeURIComponent(selected);
    try{await navigator.clipboard.writeText(url.href);$('place-action-status').textContent='Link copied.';}
    catch{$('place-share-link').hidden=false;$('place-share-link').value=url.href;$('place-share-link').select();$('place-action-status').textContent='Copy this link to share the place.';}
    $('place-action-status').hidden=false;
  };
  render();
  return{show(code){selected=String(code);$('place-action-status').hidden=true;$('place-share-link').hidden=true;render();},linkCode(){try{return location.hash.startsWith('#place=')?decodeURIComponent(location.hash.slice(7)):null;}catch{return null;}}};
}
