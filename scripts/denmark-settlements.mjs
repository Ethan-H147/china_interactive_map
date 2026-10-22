import assert from 'node:assert/strict';
import {decodeStat} from './denmark-statistics.mjs';

// BY1 lists both whole urban areas and municipal parts. Count each urban area once.
export function danishUrbanAreas(data){
 const dataset=data.dataset||data,groups=new Map();
 for(const row of decodeStat(data)){
  const code=row.BYER.slice(3);
  if(!(code==='01100'||(+code>=10000&&+code<99997)))continue;
  const group=groups.get(code)||{code,name:dataset.dimension.BYER.category.label[row.BYER].replace(/^\d{3}-\d{5}\s*/,'').replace(/ \(part of more than one municipality\)$/,''),parts:[]};
  if(row.BYER.startsWith('000'))group.aggregate=row.value;
  else group.parts.push({municipality:row.BYER.slice(0,3),value:row.value});
  groups.set(code,group);
 }
 return [...groups.values()].map(g=>{
  const sum=g.parts.reduce((s,p)=>s+p.value,0);
  if(g.aggregate>0)assert.equal(g.aggregate,sum,g.code+' municipal parts reconcile');
  return {...g,population:g.aggregate>0?g.aggregate:sum};
 }).filter(g=>g.population>=200).sort((a,b)=>a.code.localeCompare(b.code));
}
