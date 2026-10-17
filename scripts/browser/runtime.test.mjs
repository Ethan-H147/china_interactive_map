import assert from 'node:assert/strict';
import '../../dist/countries.js';

// A deterministic tile separates map-state regressions from imagery-service availability.
async function imagery(page){
 await page.send('Fetch.enable',{patterns:[{urlPattern:'*ibasemaps-api.arcgis.com/*'}]});
 page.on('Fetch.requestPaused',event=>{
  if(!event.request.url.includes('ibasemaps-api.arcgis.com/'))return;
  page.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Access-Control-Allow-Origin',value:'*'}],body:'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEVnhWd/wHiKAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAH0lEQVRo3u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAvg0hAAABfxmcpwAAAABJRU5ErkJggg=='}).catch(error=>{if(!error.message.includes('Invalid InterceptionId'))page.problems.push(error.message);});
 });
}
async function checkScene(page){
 assert.equal(await page.evaluate('mapScene.assertOrder()'),true);
 assert.equal(await page.evaluate('mapScene.satellite.visible'),true);
 const fills=await page.evaluate("map.getStyle().layers.filter(l=>l.type==='fill'&&mapScene.role(l.id)==='fill'&&map.getLayoutProperty(l.id,'visibility')!=='none').map(l=>({id:l.id,opacity:l.paint['fill-opacity']}))");
 assert(fills.length,'The active country has subdivision layers');
 assert(await page.evaluate("map.queryRenderedFeatures({layers:map.getStyle().layers.filter(l=>l.type==='fill'&&mapScene.role(l.id)==='fill'&&map.getLayoutProperty(l.id,'visibility')!=='none').map(l=>l.id)}).length>0"),'Actual subdivision geometry renders in the viewport');
 for(const fill of fills)assert(Array.isArray(fill.opacity),fill.id+' follows shared satellite styling');
}
const publicCountries=AtlasCountries.ids.filter(id=>AtlasCountries.countries[id].release!=='developer');
export default [
 {name:'an older country adapter also isolates a failed outline',options:{width:1100,height:760},async run(page,base){
  await page.send('Network.setBlockedURLs',{urls:['*mongolia-context.bin*']});
  await page.open(base,'#japan');
  assert.equal(await page.evaluate("portalLoader.status('mongolia')"),'failed');
  assert.equal(await page.evaluate("!!map.getSource('mongolia-portal')"),false);
  page.failures.length=0;page.problems.length=0;
  await page.send('Network.setBlockedURLs',{urls:[]});
  await page.evaluate("location.hash='#mongolia'");await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'mongolia');
  assert.equal(await page.evaluate('mapScene.assertOrder()'),true);
 }},
 {name:'statistical colors and motion share normal paint beneath imagery',options:{width:1100,height:760},async run(page,base){
  await imagery(page);await page.open(base,'#brazil');await page.tap('#satellite-layer');
  await page.waitFor('satelliteDisplay.state.hasTile',{label:'imagery tile'});
  const before=await page.evaluate("map.getPaintProperty('south-brazil-fill','fill-opacity')");
  await page.evaluate("AtlasRegionColorController.setMetric('population');0");await page.settle();
  assert.deepEqual(await page.evaluate("map.getPaintProperty('south-brazil-fill','fill-opacity')"),before,'Shading never treats rendered satellite opacity as normal opacity');
  await page.tap('#zoom-in');await page.settle();await checkScene(page);
  await page.tap('#satellite-layer');
  assert.equal(await page.evaluate("map.getPaintProperty('south-brazil-fill','fill-opacity')"),1);
  await page.evaluate("AtlasRegionColorController.setMetric('none');0");await page.settle();
  assert.equal(await page.evaluate("map.getPaintProperty('south-brazil-fill','fill-opacity')"),1);
 }},
 {name:'every public country inherits satellite and layer-order rules',options:{width:1100,height:760},async run(page,base){
  await imagery(page);await page.open(base,'#brazil');await page.tap('#satellite-layer');
  try{await page.waitFor('satelliteDisplay.state.hasTile',{timeout:30000,label:'imagery tile'});}catch(error){throw Error(error.message+' '+JSON.stringify(await page.evaluate('({state:satelliteDisplay.state,status:document.getElementById(\'satellite-status\').textContent})'))+' '+page.problems.join('|')+' failures='+page.failures.length);}

  for(const country of publicCountries){
   await page.evaluate("location.hash='#"+country+"'");await page.settle();
   assert.equal(await page.evaluate('AtlasEntry.current'),country);
   await checkScene(page);
  }
  await page.tap('#satellite-layer');
  assert.equal(await page.evaluate('mapScene.satellite.visible'),false);
 }},
 {name:'refresh Brazil then China satellite remains ordered with delayed background land',options:{width:1100,height:760},async run(page,base){
  // The background must reach this page's interceptor, rather than a service-worker cache.
  await page.send('Network.setBypassServiceWorker',{bypass:true});
  await imagery(page);
  await page.send('Fetch.enable',{patterns:[{urlPattern:'*ibasemaps-api.arcgis.com/*'},{urlPattern:'*china-neighbours.bin*'}]});
  let delayed=false,hold=true;const held=[];
  page.on('Fetch.requestPaused',event=>{
   if(!event.request.url.includes('china-neighbours.bin'))return;
   delayed=true;if(hold)held.push(event.requestId);else page.send('Fetch.continueRequest',{requestId:event.requestId}).catch(()=>{});
  });
  await page.open(base,'#brazil');
  await page.send('Page.reload');await page.settle();
  await page.evaluate("location.hash='#china'");await page.settle();
  assert.equal(await page.evaluate("!!map.getLayer('china-neighbour-land')"),false,'Background is still pending when China opens');
  await page.tap('#satellite-layer');
  await page.waitFor('satelliteDisplay.state.hasTile',{label:'imagery tile'});
  hold=false;await Promise.all(held.map(requestId=>page.send('Fetch.continueRequest',{requestId}).catch(()=>{})));
  await page.waitFor("!!map.getLayer('china-neighbour-land')",{label:'delayed background'});
  assert(delayed,'The test really delayed the background download');
  await checkScene(page);
  await page.evaluate("map.jumpTo({center:[88,32],zoom:4});0");
  await page.settle();await checkScene(page);
  await page.send('Page.reload');await page.settle();
  await page.waitFor('mapScene.satellite.visible',{label:'restored imagery'});await checkScene(page);
 }},
 {name:'a failed regional portal retries without duplicate resources',options:{width:1100,height:760},async run(page,base){
  await page.send('Network.setBlockedURLs',{urls:['*europe/spain/international.bin*']});
  await page.open(base,'#japan');
  await page.waitFor("europe.status('spain')==='failed'",{label:'failed Spanish portal'});
  assert.equal(await page.evaluate("!!map.getLayer('spain-portal-fill')||!!map.getSource('spain-portal')||!!document.getElementById('spain-sidebar')"),false,'A partial portal leaves no sources, fills or sidebar');
  await page.evaluate("location.hash='#spain'");
  await page.waitFor("!!document.querySelector('#status .status-retry')",{timeout:60000,label:'country retry'});
  await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'japan');
  page.failures.length=0;page.problems.length=0;
  await page.send('Network.setBlockedURLs',{urls:[]});
  await page.tap('#status .status-retry');await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'spain');
  assert.equal(await page.evaluate("document.querySelectorAll('#spain-sidebar').length"),1);
  assert.equal(await page.evaluate('mapScene.assertOrder()'),true);
 }}
];
