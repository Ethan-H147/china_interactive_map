const starPath='M12 2.2 14.8 8.2 21.4 9 16.6 13.5 17.8 20 12 16.7 6.2 20 7.4 13.5 2.6 9 9.2 8.2Z';
export function capitalIcon(national=false){
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${national?'<circle cx="12" cy="12" r="11"/>':''}<path d="${starPath}"/></svg>`;
}
export function visibleCapitals(places,{enabled,mode,quiz}){
  return enabled&&!quiz?places.filter(place=>place.atlas===mode):[];
}
export function createCapitalDisplay(map,host,data){
  let enabled=false,lastKey='',markers=[];
  const inputs=['capital-layer','k-capital-layer'].map(id=>document.getElementById(id));
  const legends=['capital-legend','k-capital-legend'].map(id=>document.getElementById(id));
  for(const legend of legends){
    for(const [national,label] of [[true,'National capital'],[false,'Provincial capital / regional seat']]){
      const item=document.createElement('span');
      item.className=national?'capital-key national':'capital-key';
      item.innerHTML=capitalIcon(national);
      item.append(document.createTextNode(label));legend.append(item);
    }
  }
  function sync(){
    const state={enabled,mode:host.mode(),quiz:host.quiz()};
    const key=JSON.stringify(state);if(key===lastKey)return;lastKey=key;
    inputs.forEach(input=>input.checked=enabled);
    legends.forEach(legend=>legend.hidden=!enabled);
    markers.forEach(marker=>marker.remove());markers=[];
    for(const place of visibleCapitals(data.places,state)){
      const national=place.kind==='national';
      const element=document.createElement('div');
      element.className='capital-marker'+(national?' national':'');
      element.tabIndex=0;element.setAttribute('role','img');
      const label=`${place.en} · ${place.local} — ${place.role}`;
      element.setAttribute('aria-label',label);
      element.innerHTML=capitalIcon(national);
      const tip=document.createElement('span');tip.className='capital-tip';tip.textContent=label;element.append(tip);
      markers.push(new maplibregl.Marker({element,anchor:'center'}).setLngLat(place.coordinates).addTo(map));
    }
  }
  inputs.forEach(input=>input.addEventListener('change',()=>{enabled=input.checked;sync();}));
  map.on('movestart',()=>document.querySelectorAll('.capital-marker:focus').forEach(element=>element.blur()));
  sync();return{sync};
}
