import assert from 'node:assert/strict';
const cases=[['brazil','BR-35','BR-3550308','BR-31'],['united-states','US-CA',null,'US-NV'],['argentina','AR-06',null,'AR-14']];
export default [false,true].map(mobile=>({name:'Resident selection fills '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:900,mobile:true}:{},async run(p,base){
 for(const [country,parent,child,other]of cases){
  await p.open(base,'#'+country);await p.waitFor('currentAtlas()?.ready&&!countrySwitching&&!cameraBusy');
  const source=country+'-first',layer=source+'-selection-fill',gate='_atlasSelection:'+layer;
  // The camera remains fixed, isolating selection updates from new viewport tiles.
  await p.evaluate(`(()=>{const manager=map.style.tileManagers[${JSON.stringify(source)}],native=manager.reload;window.recolorReloads=0;manager.reload=function(...args){recolorReloads++;return native.apply(this,args)};})()`);
  assert.equal(await p.evaluate('map.getLayoutProperty('+JSON.stringify(layer)+',"visibility")'),'visible','Selection buckets prepared before selection');
  const select=async id=>{await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.settle();};
  await select(parent);
  assert.equal(await p.evaluate('recolorReloads'),0,country+' initial highlight must not reload parent fill');
  assert(await p.evaluate('map.getFeatureState({source:'+JSON.stringify(source)+',id:'+JSON.stringify(parent)+'})['+JSON.stringify(gate)+']'),country+' parent fill active');
  const firstFill=await p.evaluate('map.style._order.indexOf('+JSON.stringify(layer)+')'),childFill=await p.evaluate('map.style._order.indexOf('+JSON.stringify(country+'-second-fill')+')');assert(firstFill>childFill&&childFill>=0,country+' parent highlight above child fills');
  assert(await p.evaluate('mapScene.assertOrder()'));
  if(child){await select(child);assert(!await p.evaluate('!!map.getFeatureState({source:'+JSON.stringify(source)+',id:'+JSON.stringify(parent)+'})['+JSON.stringify(gate)+']'),'Parent overlay clears on child selection');await select(parent);}
  await select(other);assert.equal(await p.evaluate('recolorReloads'),0,country+' switching regions keeps polygon tiles resident');
  assert(!await p.evaluate('!!map.getFeatureState({source:'+JSON.stringify(source)+',id:'+JSON.stringify(parent)+'})['+JSON.stringify(gate)+']'),'Previous parent highlight clears');
  await p.evaluate('currentAtlas().home(false)');await p.settle();assert.equal(await p.evaluate('recolorReloads'),0,country+' reset does not reload polygon fill');
  assert(!await p.evaluate('!!map.getFeatureState({source:'+JSON.stringify(source)+',id:'+JSON.stringify(other)+'})['+JSON.stringify(gate)+']'),'Reset removes highlight');
 }
}}));
