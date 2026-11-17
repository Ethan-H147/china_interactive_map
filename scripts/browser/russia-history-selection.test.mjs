import assert from 'node:assert/strict';
import {beginPixels,endPixels} from './russia-render-helpers.mjs';
export default [{name:'selected historical colors retain their own hue in light and dark appearances',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#russia/history=1648');await p.settle();
 const before=await p.evaluate('map.getStyle().layers.filter(l=>l.id.startsWith("russia-")).map(l=>l.id).sort()');
 const cases=[
  [1648,'main',[80,60],[117,153,198],[143,175,224]],
  [1648,'added',[130,65],[201,155,91],[223,175,89]],
  [1873,'bukhara',[64.42,39.77],[187,164,116],[209,185,118]],
  [1988,'SU-UA',[33,49],[200,140,127],[223,163,148]],
  [1237,'novgorod',[31.28,58.52],[133,165,121],[155,189,130]],
  [1991,'SU-UA',[33,49],[131,168,148],[155,196,172]]
 ];
 for(const appearance of ['light','dark'])for(const [year,id,[lng,lat],baseColor,selectedColor]of cases){
  await p.evaluate(`AtlasComfort.set({appearance:'${appearance}'});void currentAtlas().setHistoryYear(${year})`);await p.waitFor('currentAtlas().historicalYear==='+year);await p.settle();
  await p.evaluate(`void currentAtlas().restore('','history');void map.jumpTo({center:[${lng},${lat}],zoom:7,padding:{top:0,bottom:0,left:0,right:0}})`);await p.settle();
  const expected=baseColor.map(v=>appearance==='dark'?Math.round(v*.45+34):v);
  await beginPixels(p,[{lng,lat,color:expected,strict:true}]);await p.evaluate('map.triggerRepaint()');await p.settle();const normal=await endPixels(p);assert(normal.points>0);assert.equal(normal.bad,0,appearance+' unselected '+id+' '+JSON.stringify(normal));
  await p.evaluate(`void currentAtlas().restore('${id}','history')`);await p.settle();
  const shade=selectedColor.map(v=>appearance==='dark'?Math.round(v*.45+34):v);
  await beginPixels(p,[{lng,lat,color:shade,strict:true}]);await p.evaluate('map.triggerRepaint()');await p.settle();const selected=await endPixels(p);assert(selected.points>0);assert.equal(selected.bad,0,appearance+' selected '+id+' '+JSON.stringify(selected));
  assert(shade.some((v,i)=>v!==expected[i]),'Each color has a distinct selected counterpart');await p.screenshot('russia-selection-'+appearance+'-'+year+'-'+id);
 }
 assert.deepEqual(await p.evaluate('map.getStyle().layers.filter(l=>l.id.startsWith("russia-")).map(l=>l.id).sort()'),before,'Existing layers reused');
 await p.evaluate('void document.getElementById("historical-snapshot").click()');await p.settle();assert.equal(await p.evaluate('map.getSource("russia-first").type'),'geojson');
}}];
