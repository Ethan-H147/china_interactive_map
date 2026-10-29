import assert from 'node:assert/strict';
export default [
 ...[['mexico',1280],['mexico',390],['china',1280],['united-states',1280],['japan',1280],['korea',1280]].map(([country,width])=>({name:country+' city Preview at '+width+'px: dots, labels, satellite and no saved result',options:{width,height:900,mobile:width===390,developer:true},async run(p,base){
  // Isolate the imagery service so testing the switch does not require live tiles.
  await p.send('Fetch.enable',{patterns:[{urlPattern:'*ibasemaps-api.arcgis.com/*'}]});p.on('Fetch.requestPaused',e=>void p.send('Fetch.fulfillRequest',{requestId:e.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Access-Control-Allow-Origin',value:'*'}],body:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}));
  await p.open(base,'#'+country);await p.evaluate(country==='china'?'openChinaCities()':country==='united-states'?'currentAtlas().countyQuiz.open({level:3})':'currentAtlas().cityQuiz.open()');
  const prefix=country==='china'?'cn-cities':country==='united-states'?'us-cities':country+'-cities',panel='#'+prefix+'-quiz-panel',key='quiz-'+prefix;
  await p.waitFor('!document.querySelector('+JSON.stringify(panel+' [data-q=start]')+').disabled');
  const before=await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds');
  await p.tap(panel+' [data-city-preview-start]');await p.settle();
  assert(await p.evaluate('!document.querySelector('+JSON.stringify(panel+' [data-city-preview]')+').hidden'));
  const expected=await p.evaluate('parseInt(document.querySelector('+JSON.stringify(panel+' [data-q=count]')+').textContent)');
  assert.equal(await p.evaluate('(async()=> (await map.getSource('+JSON.stringify(key)+').getData()).features.length)()'),expected);
  const dot=await p.evaluate('(async()=>{const f=(await map.getSource('+JSON.stringify(key)+').getData()).features.find(f=>{const p=map.project(f.geometry.coordinates);return p.x>30&&p.x<map.getContainer().clientWidth-80&&p.y>180&&p.y<map.getContainer().clientHeight-180});if(!f)throw Error("No visible preview dot");const p=map.project(f.geometry.coordinates),b=map.getCanvas().getBoundingClientRect();return{x:b.left+p.x,y:b.top+p.y,id:f.properties.id}})()');
  if(width===390)await p.tap([dot.x,dot.y]);else await p.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:dot.x,y:dot.y});
  await p.waitFor('!!document.querySelector(".city-preview-popup strong")');assert(await p.evaluate('document.querySelector(".city-preview-popup strong").textContent.length>0'));
  await p.screenshot('city-preview-'+country+'-'+width); for(const value of [true,false]){await p.tap('#quiz-satellite-toggle');assert.equal(await p.evaluate('document.getElementById("satellite-layer").checked'),value);assert.equal(await p.evaluate('map.getLayoutProperty("satellite-imagery","visibility")'),value?'visible':'none');}
  if(width===390)await p.tap('#home');else await p.tap(panel+' [data-city-preview-end]');await p.settle();
  assert(!await p.evaluate('!!map.getLayer('+JSON.stringify(key+'-dots')+')'));assert(!await p.evaluate('!!document.querySelector(".city-preview-popup")'));
  assert.equal(await p.evaluate('AtlasQuizRecords.quizRecords.data.summary.rounds'),before);
  await p.tap(panel+' [data-q=start]');await p.settle();assert(!await p.evaluate('document.getElementById("quiz-satellite-toggle").hidden'));
  await p.tap('#quiz-satellite-toggle');assert.equal(await p.evaluate('map.getLayoutProperty("satellite-imagery","visibility")'),'visible');
  assert(!await p.evaluate('!!document.querySelector(".city-preview-popup")'),'Scored rounds do not expose Preview labels');
  await p.tap('#quiz-satellite-toggle');await p.tap('#home');await p.settle();
 }}))
];
