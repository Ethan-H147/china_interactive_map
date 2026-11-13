const hex=value=>{if(typeof value!=='string')return null;let s=value.trim().replace(/^#([a-f\d])([a-f\d])([a-f\d])$/i,'#$1$1$2$2$3$3');if(!/^#[a-f\d]{6}$/i.test(s))return null;return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16));};
const color=rgb=>'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
export const liftAccent=value=>{const rgb=hex(value);return rgb?color(rgb.map(v=>v*.55+255*.45)):'#e4a38b';};
const standard={'#548165':'#70bf93','#b44737':'#ef927e','#d4ad55':'#e9c86c'};
const accessible={'#548165':'#4598d5','#548165ff':'#4598d5','#b44737':'#e9a345','#d4ad55':'#b88af0'};
export function appearancePaint(paint,entry,satellite=0){
 const preference=globalThis.AtlasComfort?.get(),dark=globalThis.document?.documentElement.dataset.colorMode==='dark',alternate=preference?.palette==='accessible';
 if(!dark&&!alternate)return paint;
 const transform=(value,property)=>{
  if(Array.isArray(value))return value.map(v=>transform(v,property));
  const rgb=hex(value);if(!rgb)return value;
  const lower=value.toLowerCase();if(alternate&&accessible[lower])return accessible[lower];
  if(dark&&standard[lower])return standard[lower];
  if(!dark||satellite)return value;
  if(property==='text-halo-color')return '#17222c';
  if(property==='text-color')return '#e5e2dc';
  if(entry.role==='background'||entry.backgroundFill)return '#101923';
  if(entry.role==='water')return '#112632';
  if(entry.role==='waterLine')return '#426a82';
  if(entry.type==='line'||entry.type==='circle')return color(rgb.map(v=>v*.5+105));
  if(['land','context'].includes(entry.role))return color(rgb.map(v=>v*.09+26));
  if(entry.type==='fill')return color(rgb.map(v=>v*(rgb.reduce((a,b)=>a+b,0)/765>.72?.16:.45)+34));
  return value;
 };
 return Object.fromEntries(Object.entries(paint).map(([key,value])=>[key,key.endsWith('color')?transform(value,key):value]));
}
