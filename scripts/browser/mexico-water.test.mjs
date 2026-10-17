import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const anchors=[['MX-CAM',[-91.7,18.6]],['MX-TAB',[-93.116,18.416]],['MX-VER',[-95.78,18.75]],['MX-CHP',[-93.734931,17.183045]]];
const hit=(layer,point)=>'map.queryRenderedFeatures(map.project('+JSON.stringify(point)+'),{layers:['+JSON.stringify(layer)+']}).length';
export default [
 ...[false,true].map(mobile=>({name:(mobile?'phone':'desktop')+' Mexico water toggles without breaking land, borders or saved views',options:{width:mobile?390:1280,height:mobile?844:820,mobile},async run(page,base){
  await page.open(base,'#mexico');
  assert.equal(await page.evaluate('document.getElementById("mx-water-layer").checked'),false);
  assert(!page.requests.some(u=>u.endsWith('/mexico/water.bin')),'Water stays opt-in');
  await searchAndSelect(page,'Tabasco','Tabasco','State');
  await page.tap('#mx-tab-layers');
  await page.evaluate('window.__mexicoFill=map.getSource("mexico-first");window.__mexicoEdges=map.getSource("mexico-first-edges");0');
  for(const [id,p] of anchors){
   await page.evaluate('map.jumpTo({center:'+JSON.stringify(p)+',zoom:8});0');await page.settle();
   assert(await page.evaluate(hit('mexico-first-fill',p)),id+' lagoon has solid base land');
  }
  await page.tap('#mx-water-layer');
  await page.waitFor('!!map.getLayer("mexico-lakes")&&map.getLayoutProperty("mexico-lakes","visibility")==="visible"',{timeout:30000,label:'blue water overlay'});
  await page.settle();
  for(const [id,p] of anchors){
   await page.evaluate('map.jumpTo({center:'+JSON.stringify(p)+',zoom:8});0');await page.settle();
   assert(await page.evaluate(hit('mexico-lakes',p)),id+' water renders blue at its mapped location');
   assert(await page.evaluate(hit('mexico-first-fill',p)),id+' remains selectable beneath water');
  }
  assert.equal(await page.evaluate('mapScene.assertOrder()'),true);
  await page.evaluate('map.jumpTo({center:[-92.6,18.15],zoom:7});0');await page.settle();
  await page.screenshot('mexico-water-on-'+(mobile?'phone':'desktop'));
  await page.tap('#mx-water-layer');await page.settle();
  assert.equal(await page.evaluate('map.getLayoutProperty("mexico-lakes","visibility")'),'none');
  assert.equal(await page.evaluate('map.getSource("mexico-first")===__mexicoFill&&map.getSource("mexico-first-edges")===__mexicoEdges'),true,'Toggling never swaps administrative geometry');
  await page.screenshot('mexico-water-off-'+(mobile?'phone':'desktop'));
  await page.tap('#mx-water-layer');await page.settle();
  await page.send('Page.reload');await page.settle();
  await page.waitFor('document.getElementById("mx-water-layer").checked&&!!map.getLayer("mexico-lakes")&&map.getLayoutProperty("mexico-lakes","visibility")==="visible"',{label:'saved water setting restores'});
  await page.evaluate('location.hash="#united-states"');await page.settle();
  assert.equal(await page.evaluate('!!map.getSource("mexico-water")'),false,'Leaving releases water data');
  await page.evaluate('location.hash="#mexico"');await page.settle();
  await page.waitFor('!!map.getLayer("mexico-lakes")&&map.getLayoutProperty("mexico-lakes","visibility")==="visible"',{label:'returning to Mexico restores water'});
 }}))
 ,{name:'water loaded during satellite mode keeps its blue paint and state borders',options:{width:1280,height:820},async run(page,base){
  await page.send('Fetch.enable',{patterns:[{urlPattern:'*ibasemaps-api.arcgis.com/*'}]});
  page.on('Fetch.requestPaused',event=>{page.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Access-Control-Allow-Origin',value:'*'}],body:'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEVnhWd/wHiKAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAH0lEQVRo3u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAvg0hAAABfxmcpwAAAABJRU5ErkJggg=='}).catch(()=>{});});
  await page.open(base,'#mexico');await searchAndSelect(page,'Tabasco','Tabasco','State');await page.tap('#mx-tab-layers');await page.tap('#satellite-layer');
  await page.waitFor('satelliteDisplay.state.hasTile',{label:'satellite tile'});await page.tap('#mx-water-layer');
  await page.waitFor('!!map.getLayer("mexico-lakes")&&map.getLayoutProperty("mexico-lakes","visibility")==="visible"');await page.settle();
  assert.equal(await page.evaluate('mapScene.assertOrder()'),true);assert.equal(await page.evaluate('map.getPaintProperty("mexico-lakes","fill-color")'),'#8cb5c4');
  assert(await page.evaluate('map.queryRenderedFeatures({layers:["mexico-first-lines"]}).length>0'));
  await page.tap('#satellite-layer');await page.tap('#mx-water-layer');await page.settle();
  assert.equal(await page.evaluate('map.getLayoutProperty("mexico-lakes","visibility")'),'none');
  assert.equal(await page.evaluate('map.getPaintProperty("mexico-first-fill","fill-opacity")'),1);
 }}

];
