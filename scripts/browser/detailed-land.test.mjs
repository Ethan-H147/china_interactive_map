import assert from 'node:assert/strict';
const forbidden=/^(globe-overview|modern-context-detail)|-portal(?:-fill)?$/;
const invariant=async p=>{const state=await p.evaluate(`({layers:map.style._order,sources:Object.keys(map.getStyle().sources),handoff:!!window.AtlasGlobeOverviewController,order:mapScene.assertOrder(),land:AtlasDetailedLandController.snapshot()})`);assert(!state.layers.some(id=>forbidden.test(id)),state.layers);assert(!state.sources.some(id=>forbidden.test(id)),state.sources);assert.equal(state.handoff,false);assert(state.order);assert.equal(state.land.geometry,'canonical');};
async function jump(p,center,zoom){await p.evaluate('void map.jumpTo('+JSON.stringify({center,zoom,padding:{top:0,right:0,bottom:0,left:0}})+')');await p.settle();}
const sample=p=>p.evaluate(`(()=>{const c=map.project([-70.25,41.78]),out=[];for(let y=-120;y<=120;y+=8)for(let x=-150;x<=150;x+=8)out.push(map.queryRenderedFeatures([c.x+x,c.y+y],{layers:['world-land']}).some(f=>f.properties.country==='united-states'));return out})()`);
export default [
 {name:'Detailed background matches the active coast, and every former zoom threshold keeps the same sources',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#russia');await p.evaluate('AtlasComfort.set({appearance:"light"})');await invariant(p);
  for(const zoom of [3.5,3.9,4.1,4.8,5.3,6.6,7,7.3,7.8,8.1,10,7.5,5,3.8]){await jump(p,[-70.25,41.78],zoom);await invariant(p);}
  await jump(p,[-70.25,41.78],10);const background=await sample(p);assert(background.includes(true)&&background.includes(false));assert.equal(await p.evaluate('countryAt(map.project([-70.29,41.66]))?.country'),'united-states');
  const source=await p.evaluate('map.getSource("world-land").serialize().data');await jump(p,[-70.24,41.79],10);assert.equal(await p.evaluate('map.getSource("world-land").serialize().data'),source,'Buffered views retain their prepared geometry');
  await p.evaluate('changeAtlas("united-states",false)');await p.settle();await jump(p,[-70.25,41.78],10);assert.deepEqual(await sample(p),background,'Opening a country does not change its coastline');await invariant(p);await p.screenshot('detailed-land-cape-cod');
 }},
 {name:'Phone pans cross the dateline and both poles without coarse layers or geometry upgrades',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#russia');for(const [center,zoom]of [[[179,64],3],[[-179,64],4],[[141.9,52.35],7.4],[[0,82],2],[[0,-80],1],[[100,-75],4],[[120,-3],4],[[14,68],6]]){await jump(p,center,zoom);await invariant(p);assert(await p.evaluate('map.queryRenderedFeatures({layers:["world-land"]}).length>0'),'Land remains visible');}
  await p.evaluate('changeAtlas("antarctica",false)');await p.settle();await invariant(p);assert(await p.evaluate('currentAtlas().ready'));await p.screenshot('detailed-land-phone-antarctica');assert(!p.requests.some(url=>/\/lite\/|globe-overview|\/[^/]*context\.bin/.test(url)),'No old coarse data requests');
 }}
];
