import assert from 'node:assert/strict';
import fs from 'node:fs';
const refs=JSON.parse(fs.readFileSync('dist/data/remaining-seams.json'));
export default [false,true].map(mobile=>({name:'Remaining Tianjin borders and Qitaihe outline '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:900,mobile},async run(p,base){
 await p.open(base,'#china');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");
 for(const r of [refs[0],refs[1],refs[3]]){
  const i=Math.floor(r.path.length/2),a=r.path[i-1],b=r.path[i],point=a.map((v,j)=>(v+b[j])/2),layer=r.group==='province'?'province-lines':'prefecture-lines';
  if(r.group==='prefecture')await p.evaluate('selectRegion(regionByCode.get(230900),230000,false)');
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:12})');await p.settle();
  assert(await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return map.queryRenderedFeatures([[q.x-3,q.y-3],[q.x+3,q.y+3]],{layers:["'+layer+'"]}).length>0})()'),'Repaired shared outline renders');
 }
 await p.screenshot('qitaihe-outline-'+(mobile?'phone':'desktop'));
}}));
