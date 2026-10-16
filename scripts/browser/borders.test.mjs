import assert from 'node:assert/strict';

// Share of sampled outline segments with no fill of the open country on one side and no land
// beyond it: strokes along a coast. Only the selected place is outlined all the way round.
const coastShare=`(()=>{const vis=map.getStyle().layers.filter(l=>map.getLayoutProperty(l.id,'visibility')!=='none');
 const skip=/selected|selection|international|frontier|boundaries|context|borders|neighbour|portal|world|south-america-fill|label|settlement|sea|water|satellite|motion|highlight|hover|dev/;
 const lines=vis.filter(l=>l.type==='line'&&!skip.test(l.id)).map(l=>l.id),fills=vis.filter(l=>l.type==='fill'&&!skip.test(l.id)).map(l=>l.id);
 const land=vis.filter(l=>l.type==='fill'&&/world|portal|south-america-fill|neighbour|context/.test(l.id)).map(l=>l.id);
 const W=map.getCanvas().clientWidth,H=map.getCanvas().clientHeight,at=(x,y,layers)=>map.queryRenderedFeatures([x,y],{layers}).length>0;
 let total=0,coast=0;
 for(const f of map.queryRenderedFeatures({layers:lines})){const g=f.geometry,parts=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];
  for(const p of parts)for(let i=0;i+1<p.length;i+=3){const a=map.project(p[i]),b=map.project(p[i+1]),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<1)continue;
   const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;if(mx<20||my<20||mx>W-20||my>H-20)continue;const nx=-dy/len*3,ny=dx/len*3;total++;
   const A=at(mx+nx,my+ny,fills),B=at(mx-nx,my-ny,fills);if(A&&B)continue;const ex=A?mx-nx*2:mx+nx*2,ey=A?my-ny*2:my+ny*2;if(!at(ex,ey,land))coast++;}}
 return {total,coast};})()`;
const borderAt=`map.queryRenderedFeatures({layers:map.getStyle().layers.filter(l=>l.metadata?.atlasInternationalBorder).map(l=>l.id)}).length`;

export default [
 {name:'every frontier shows whichever country is open',options:{width:1100,height:760},async run(page,base){
  await page.open(base,'#japan');
  for(const [name,center,zoom] of [['Russia–Kazakhstan',[66,52.5],5],['Brazil–Paraguay',[-55,-23.5],6],['Malaysia–Thailand',[101.3,5.9],7.5],['China–India',[93.5,28],5]]){
   await page.evaluate(`map.jumpTo({center:${JSON.stringify(center)},zoom:${zoom}});0`);await page.settle();
   assert(await page.waitFor(borderAt,{label:name+' frontier'}),name+' frontier is drawn with Japan open');
  }
 }},
 {name:'South America is detailed before it is opened',options:{width:1100,height:760},async run(page,base){
  await page.open(base,'#japan');
  await page.waitFor(`!!map.getLayer('south-america-fill')&&map.isSourceLoaded('flight-context')&&map.getLayoutProperty('south-land-boundaries','visibility')==='visible'`,{label:"South America's shapes and borders"});
 }},
 {name:'a country drawing its own frontier hides the shared copy while open',options:{width:1100,height:760},async run(page,base){
  await page.open(base,'#indonesia');
  assert(JSON.stringify(await page.evaluate(`map.getFilter('atlas-frontiers')`)).includes(' indonesia '),'Indonesia hides its shared frontier while open');
  await page.evaluate(`location.hash='#japan'`);await page.settle();
  // Only lines inside land the open country claims are filtered (Japan has none).
  assert.deepEqual(await page.evaluate(`map.getFilter('atlas-frontiers')`),['!=',['coalesce',['get','claimedBy'],''],'japan'],'Every frontier shows with Japan open');
 }},
 {name:'outlines leave coasts to the selected place',options:{width:1100,height:760},async run(page,base){
  for(const country of ['china','japan','philippines','indonesia','malaysia','korea']){
   await page.open(base,'#'+country);await page.settle();
   const {total,coast}=await page.evaluate(coastShare);
   assert(total>20,country+' draws outlines');
   assert(coast/total<.2,`${country}: ${coast} of ${total} sampled outline segments follow a coast`);
  }
 }}
];
