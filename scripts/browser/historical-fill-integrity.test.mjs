import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const prefix='united-kingdom-history',dock='#'+prefix+'-dock';
async function ready(p){await p.waitFor('!currentAtlas().historicalMemory?.active&&!currentAtlas().historicalMemory?.queued',{timeout:35000});await p.settle();}
async function year(p,value){
 await p.evaluate('void document.querySelector('+JSON.stringify(dock+' [data-year="'+value+'"]')+').click()');
 await p.waitFor('document.querySelector('+JSON.stringify(dock+' .election-year strong')+').textContent==="'+value+'"');await p.settle();
}
async function jump(p,center,zoom,minZoom){
 await p.evaluate('void map.jumpTo('+JSON.stringify({center,zoom})+')');
 if(zoom>=minZoom)await p.waitFor('map.getLayer("'+prefix+'-coast-detail")&&map.getPaintProperty("'+prefix+'-coast-detail","fill-opacity")===1',{timeout:90000});
 await ready(p);
}
async function select(p,point,name){
 const xy=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+'),r=map.getCanvas().getBoundingClientRect();return [r.x+q.x,r.y+q.y]})()');
 await p.tap(xy);await p.waitFor('document.querySelector("#gb-name").textContent==='+JSON.stringify(name),{timeout:60000});await ready(p);
}
async function solid(file,box,minimum=.995){
 const {data}=await sharp(file).extract(box).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const colors=new Map();for(let i=0;i<data.length;i+=3){const key=data.subarray(i,i+3).join(',');colors.set(key,(colors.get(key)||0)+1);}
 const [dominant]=[...colors].sort((a,b)=>b[1]-a[1])[0];
 const rgb=dominant.split(',').map(Number);let same=0;
 for(let i=0;i<data.length;i+=3)if(rgb.every((value,j)=>Math.abs(value-data[i+j])<=2))same++;
 assert(same/(data.length/3)>=minimum,'Interior fill is solid: '+same+'/'+data.length/3+' pixels in '+file);
 return dominant;
}
export default [{
 name:'Selected historical fills stay solid and omit internal survey strokes across regions and zooms',
 options:{width:1600,height:1060},
 async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true');"});
  await p.open(base,'#united-kingdom');
  await p.evaluate('AtlasComfort.set({appearance:"light"});void document.querySelector("#historical-snapshot").click()');
  await p.waitFor('!!map.getLayer("'+prefix+'-fill")');
  await year(p,1779);await jump(p,[-85,30],5.8,7);await select(p,[-82,28],'East and West Florida');
  await jump(p,[-85,30],5.3,7);
  const first=await p.screenshot('historical-fill-solid-florida-overview');
  await solid(first,{left:660,top:490,width:100,height:30});
  const query=point=>p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return map.queryRenderedFeatures([[q.x-1,q.y-1],[q.x+1,q.y+1]],{layers:["'+prefix+'-selected"]}).length})()');
  assert.equal(await query([-88,32.382]),0,'The old survey join is not a selected border');
  assert(await query([-88,32+28/60]),'The true northern selected boundary remains');
  for(const zoom of [4.8,5.1,5.49,5.51,6.99,7.01,7.2,5.3]){
   await jump(p,[-85,30],zoom,7);
   assert.equal(await p.evaluate('map.getSource("'+prefix+'-faces").serialize().tolerance'),0,'Overview faces retain exact paths');
   if(zoom>=7)assert.equal(await p.evaluate('map.getSource("'+prefix+'-coast-detail").serialize().tolerance'),0,'Detailed faces retain exact paths');
  }
  const repeat=await p.screenshot('historical-fill-solid-florida-return');
  assert.equal(await solid(repeat,{left:660,top:490,width:100,height:30}),await solid(first,{left:660,top:490,width:100,height:30}),'Selection keeps its color through the detail handoff');
  const cases=[
   {year:1763,name:'Nova Scotia',point:[-63.62,44.65],center:[-63.5,45.5],zooms:[4.8,5.3,7.2],minZoom:7},
   {year:1927,name:'Dominion of Newfoundland',point:[-56,49],center:[-59,52],zooms:[4.8,5.3,7.2],minZoom:7},
   {year:1901,name:'Commonwealth of Australia',point:[133.88,-23.7],center:[133,-25],zooms:[4.5,5.3,7.2],minZoom:7},
   {year:1946,name:'British Raj',point:[79,22],center:[79,23],zooms:[4.5,5.3,7.2],minZoom:7}
  ];
  for(const entry of cases){
   await year(p,entry.year);await jump(p,entry.center,entry.zooms[0],entry.minZoom);await select(p,entry.point,entry.name);
   for(const zoom of entry.zooms){
    await jump(p,entry.center,zoom,entry.minZoom);
    for(const layer of await p.evaluate('map.getStyle().layers.filter(l=>l.type==="fill"&&l.id.startsWith("'+prefix+'")).map(l=>({source:l.source}))'))
     assert.equal(await p.evaluate('map.getSource('+JSON.stringify(layer.source)+').serialize().tolerance'),0,entry.name+' uses exact fill geometry');
    assert(await p.evaluate('mapScene.assertOrder()'));
    await p.screenshot('historical-fill-selected-'+entry.year+'-'+zoom);
   }
  }
  assert.equal(await p.evaluate('Object.keys(map.getStyle().sources).filter(id=>id==="'+prefix+'-coast-detail").length'),1,'Only the current regional coast source remains resident');
 }
},{
 name:'Selected historical fills stay solid through flat globe and dark appearance changes',
 options:{width:1600,height:1060},
 async run(p,base){
  await p.open(base,'#united-kingdom');
  await p.evaluate('AtlasComfort.set({appearance:"light"});void document.getElementById("historical-snapshot").click()');
  await p.waitFor('!!map.getLayer("'+prefix+'-fill")');
  await year(p,1779);await jump(p,[-85,30],5.3,7);await select(p,[-82,28],'East and West Florida');
  const colors={};
  for(const [projection,appearance] of [['mercator','light'],['mercator','dark'],['globe','dark'],['globe','light']]){
   await p.evaluate('void map.setProjection('+JSON.stringify({type:projection})+');AtlasComfort.set({appearance:'+JSON.stringify(appearance)+'})');await p.settle();
   const xy=await p.evaluate('(()=>{const q=map.project([-88,31.3]);return [Math.round(q.x),Math.round(q.y)]})()');
   const file=await p.screenshot('historical-fill-solid-'+projection+'-'+appearance);
   const color=await solid(file,{left:xy[0]-10,top:xy[1]-10,width:20,height:20});
   if(colors[appearance])assert.equal(color,colors[appearance],'Projection preserves the selected fill color');
   colors[appearance]=color;
  }
  assert.notEqual(colors.light,colors.dark,'The selected fill follows the appearance');
 }
},{
 name:'Historical detailed coasts refresh their buffered window when panning within one region',
 options:{width:1600,height:1060},
 async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true');"});
  await p.open(base,'#united-kingdom');await p.evaluate('void document.getElementById("historical-snapshot").click()');
  await p.waitFor('!!map.getLayer("'+prefix+'-fill")');await year(p,1775);
  let previous;
  for(const entry of [
   {center:[-73.5,41],land:[-73.9,40.8],water:[-73.1,41.1],name:'Thirteen Colonies'},
   {center:[-82.5,27.8],land:[-82.46,27.95],water:[-82.55,27.75],name:'East and West Florida'},
   {center:[-73.5,41],land:[-73.9,40.8],water:[-73.1,41.1],name:'Thirteen Colonies'}
  ]){
   await jump(p,entry.center,9,7);
   const url=await p.evaluate('map.getSource("'+prefix+'-coast-detail").serialize().data');
   const scope=new URLSearchParams(url.slice(url.indexOf('?')+1)).get('scope');assert(scope,'The coastline tile input is limited to a buffered view');
   if(previous)assert.notEqual(scope,previous,'A distant pan inside North America rebuilds the local window');previous=scope;
   const hover=point=>p.evaluate('currentAtlas().hoverAt(map.project('+JSON.stringify(point)+'))?.en??null');
   assert.equal(await hover(entry.land),entry.name,'The new window retains dated land ownership');
   assert.equal(await hover(entry.water),null,'The new window retains real water');
   assert(!await p.evaluate('!!map.getSource("modern-context-detail")'),'The historical view keeps one detailed coastline provider');
  }
 }
}];
