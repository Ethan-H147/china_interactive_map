import './countries.js';
const registry=globalThis.AtlasCountries,countries=registry.ids;
const colorMetrics=['none','population','populationDensity','gdp','gdpPerCapita'];
export const controls=[...new Set(countries.flatMap(id=>registry.countries[id].controls||[]))];
export function validate(value){
 if(!value||value.v!==1||!countries.includes(value.country)||!Array.isArray(value.center)||value.center.length!==2||!value.center.every(Number.isFinite)||value.center[0]<-180||value.center[0]>(registry.countries[value.country].worldCopies?200:180)||value.center[1]<-65||value.center[1]>80||!Number.isFinite(value.zoom)||value.zoom<.5||value.zoom>16)return null;
 const layers={};for(const id of controls){const v=value.layers?.[id];if(id==='satellite-opacity'){if(Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100)layers[id]=String(v);}else if(typeof v==='boolean')layers[id]=v;}
 const options=registry.countries[value.country].view,language=options.languages.includes(value.language)?value.language:options.language;
 return {v:1,country:value.country,center:value.center,zoom:value.zoom,selection:typeof value.selection==='string'||typeof value.selection==='number'?String(value.selection).slice(0,80):null,scope:options.scopes.includes(value.scope)?value.scope:'',mode:value.mode===3&&options.maxMode===3?3:value.mode===2?2:1,locked:value.locked===true,language,colorBy:colorMetrics.includes(value.colorBy)?value.colorBy:"none",layers};
}
export function fromHash(hash){try{const m=registry.viewRoute.exec(hash);if(!m||m[2].length>10000)return null;const value=validate(JSON.parse(decodeURIComponent(m[2])));return value?.country===m[1].toLowerCase()?value:null;}catch{return null;}}
export function hashFor(view){const valid=validate(view);return valid?'#'+valid.country+'/view='+encodeURIComponent(JSON.stringify(valid)):null;}
const storageKey='boundary-atlas-view-v2-',legacyKey='boundary-atlas-view-v1-';
// v1 views could record the previous country's camera after an interrupted
// country flight. Keep their settings once, without the camera.
export function read(country,storage){
 try{const view=validate(JSON.parse(storage.getItem(storageKey+country)));if(view)return view;}catch{}
 try{const legacy=validate(JSON.parse(storage.getItem(legacyKey+country)));storage.removeItem?.(legacyKey+country);return legacy&&{...legacy,camera:false};}catch{return null;}
}
export function write(view,storage){const valid=validate(view);if(!valid)return;try{storage.setItem(storageKey+valid.country,JSON.stringify(valid));}catch{}}
