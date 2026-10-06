export function chooseProfile(search,storage){
 const explicit=new URLSearchParams(search).get('china-boundaries');if(['original','detail'].includes(explicit))return explicit;
 try{const saved=storage?.getItem('china-boundaries-v1');if(['original','detail'].includes(saved))return saved;}catch{}
 return 'detail';
}
let storage;try{storage=typeof localStorage==='undefined'?null:localStorage;}catch{}
export const profile=chooseProfile(typeof location==='undefined'?'':location.search,storage);
export const root=profile==='detail'?'data/china-detail/':'data/';
export const displayManifest=profile==='detail'?'display.parts.json':'display-boundaries.parts.json';
export async function decodeDisplay(data,format){
 if(format!=='topojson')return data;
 const {feature}=await import('./vendor/topojson-client/index.js');
 return {provinces:feature(data,data.objects.provinces),subdivisions:feature(data,data.objects.subdivisions),annotations:feature(data,data.objects.annotations),boundaries:Object.fromEntries(['province','prefecture','other'].map(key=>[key,feature(data,data.objects[key]).geometry]))};
}
export function mount(parent,onChange){
 const section=document.createElement('section');section.className='view-preferences';
 const label=document.createElement('label');label.className='field-label';label.htmlFor='china-boundary-profile';label.textContent='Boundary data';
 const select=document.createElement('select');select.id=label.htmlFor;select.setAttribute('data-nav','');select.disabled=true;
 for(const [value,text]of [['detail','Finer prefectures (preview)'],['original','Original boundaries']])select.append(new Option(text,value));select.value=profile;
 select.onchange=()=>{try{localStorage.setItem('china-boundaries-v1',select.value);}catch{}onChange(select.value);};
 const link=document.createElement('a');link.className='quiet-button';link.href='data/china-detail/source.json';link.target='_blank';link.rel='noopener';link.textContent='Boundary sources & preserved areas';
 section.append(label,select,link);parent.prepend(section);
}
