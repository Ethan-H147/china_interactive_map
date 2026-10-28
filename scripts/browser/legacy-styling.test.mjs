import assert from 'node:assert/strict';
const codes=[130000,150000,210000,220000,230000,540000,630000,650000];
const colors=(p,layer='province-fill',states=false)=>p.evaluate(`(()=>{const layer=map.getLayer(${JSON.stringify(layer)}),paint=map.style.getLayer(layer.id).paint.get('fill-color');return ${JSON.stringify(codes)}.map(adcode=>paint.evaluate({properties:{adcode}},${states?'map.getFeatureState({source:layer.source,id:adcode})':'{}'}))})()`);
const distinct=values=>new Set(values.map(v=>JSON.stringify(v))).size;
async function imagery(p){
 await p.send('Fetch.enable',{patterns:[{urlPattern:'*ibasemaps-api.arcgis.com/*'}]});
 p.on('Fetch.requestPaused',event=>{
  if(!event.request.url.includes('ibasemaps-api.arcgis.com/'))return;
  p.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Access-Control-Allow-Origin',value:'*'}],body:'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEVnhWd/wHiKAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAH0lEQVRo3u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAvg0hAAABfxmcpwAAAABJRU5ErkJggg=='}).catch(error=>{if(!error.message.includes('Invalid InterceptionId'))p.problems.push(error.message);});
 });
}
async function toggle(p){await p.tap('#settings-open');await p.tap('#settings-legacy-styling');await p.tap('#settings-close');await p.settle();}
const scenarios=[1280,390].map(width=>({name:'China uniform and legacy province fills, saved preference, metric and quiz colors '+width,options:{width,height:900,mobile:width===390,developer:true},async run(p,base){
 await imagery(p);await p.open(base,'#china');await p.tap('#mode-province');await p.tap('#mode-lock');await p.evaluate('window.AtlasSheet?.collapse()');
 assert.equal(await p.evaluate('AtlasSettings.getSettings().legacyStyling'),false,'Shared fill is the default');
 const uniform=await colors(p);assert.equal(distinct(uniform),1,'All sampled provinces render the same color');assert.deepEqual(await colors(p,'province-fragment-fill'),uniform,'Jilin fragment fill matches the province fill');await p.screenshot('china-uniform-styling-'+width);
 await toggle(p);const legacy=await colors(p);assert(distinct(legacy)>1,'Legacy toggle restores distinct province colors');assert.deepEqual(await colors(p,'province-fragment-fill'),legacy);await p.screenshot('china-legacy-styling-'+width);
 await p.open(base,'#china');assert.equal(await p.evaluate('AtlasSettings.getSettings().legacyStyling'),true,'Legacy preference survives refresh');assert.deepEqual(await colors(p),legacy);
 if(width===390)for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#china-sidebar .sheet-handle');
 await p.evaluate('document.getElementById("satellite-opacity").value="60";document.getElementById("satellite-opacity").dispatchEvent(new Event("input",{bubbles:true}))');await p.tap('#satellite-layer');await p.waitFor('satelliteDisplay.state.hasTile');await p.settle();const satelliteOpacity=await p.evaluate('map.getPaintProperty("province-fill","fill-opacity")');await toggle(p);assert.deepEqual(await colors(p),uniform);assert.deepEqual(await p.evaluate('mapScene.satellite'),{visible:true,opacity:.6});assert.deepEqual(await p.evaluate('map.getPaintProperty("province-fill","fill-opacity")'),satelliteOpacity,'Styling preserves satellite transparency');await p.tap('#satellite-layer');await toggle(p);
 await p.evaluate('AtlasRegionColorController.setMetric("population")');await p.settle();const metric=await colors(p);assert(distinct(metric)>1,'Population shading is active');await toggle(p);assert.deepEqual(await colors(p),metric,'Changing base styling preserves active statistical shading');assert.deepEqual(await colors(p,'province-fragment-fill'),metric);
 await p.evaluate('AtlasRegionColorController.setMetric("none")');await p.settle();assert.deepEqual(await colors(p),uniform,'Leaving statistical shading restores current setting');
 await p.evaluate('selectRegion(provinceLayers.get(220000),220000,false)');await p.settle();const selection=await p.evaluate('selected.layer.feature.properties.adcode'),selectedColor=(await colors(p,'province-fill',true))[3];await toggle(p);assert.equal(await p.evaluate('selected.layer.feature.properties.adcode'),selection);assert.deepEqual((await colors(p,'province-fill',true))[3],selectedColor,'Selection remains highlighted');assert.deepEqual((await colors(p,'province-fragment-fill',true))[3],selectedColor);
 await p.tap('#tab-quiz');await p.tap('#quiz-start');await p.settle();assert(await p.evaluate('quiz.active'));const quizColors=await colors(p,'province-fill',true);await toggle(p);assert.deepEqual(await colors(p,'province-fill',true),quizColors,'Quiz backgrounds retain their answer-hiding colors');await p.tap('#home');await p.settle();assert(!await p.evaluate('quiz.active'));assert.deepEqual(await colors(p),uniform,'Uniform fill returns after quiz exit');
 await p.evaluate('void changeAtlas("south-africa")');await p.settle();const other=await p.evaluate('mapScene.basePaint("south-africa-first-fill","fill-color")');await toggle(p);assert.deepEqual(await p.evaluate('mapScene.basePaint("south-africa-first-fill","fill-color")'),other,'Other countries keep their own themes');
 await p.evaluate('void changeAtlas("china")');await p.settle();assert.deepEqual(await colors(p),legacy,'Preference follows a country switch');await p.tap('#settings-open');await p.screenshot('settings-legacy-styling-'+width);await p.tap('#settings-reset');await p.tap('#settings-close');await p.settle();assert.deepEqual(await colors(p),uniform,'Reset restores shared colors');assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
}}));

// Legacy styling lives in developer mode: hidden and inactive otherwise. Indonesia's earlier pale fill is its legacy colour.
const indonesiaFill=p=>p.evaluate('(()=>{const id="indonesia-first-fill";return map.style.getLayer(id).paint.get("fill-color").evaluate({properties:{}},{})})()');
const rgb=c=>[c.r,c.g,c.b].map(v=>Math.round(v*255));
const saveLegacy=async(p,base)=>{await p.open(base,'#indonesia');await p.evaluate('AtlasSettings.setSettings({legacyStyling:true})');await p.open(base,'?reload#indonesia');};
scenarios.push({name:'Indonesia contrast fill; saved legacy styling hidden and inactive outside developer mode',options:{width:1280,height:900},async run(p,base){
 await saveLegacy(p,base);assert.equal(await p.evaluate('AtlasSettings.getSettings().legacyStyling'),true);
 assert.deepEqual(rgb(await indonesiaFill(p)),[239,214,209],'A saved legacy preference is inactive outside developer mode');
 await p.tap('#settings-open');assert(await p.evaluate('document.querySelector("[for=settings-legacy-styling]").hidden'),'Legacy styling is hidden outside developer mode');await p.tap('#settings-close');
 await p.screenshot('indonesia-contrast-fill');
}},{name:'Indonesia legacy fill in developer mode',options:{width:1280,height:900,developer:true},async run(p,base){
 await saveLegacy(p,base);assert.deepEqual(rgb(await indonesiaFill(p)),[255,245,243],'Developer legacy styling restores the earlier fill');
 await p.tap('#settings-open');assert(!await p.evaluate('document.querySelector("[for=settings-legacy-styling]").hidden'));await p.tap('#settings-close');
 await toggle(p);assert.deepEqual(rgb(await indonesiaFill(p)),[239,214,209],'Turning legacy off applies the contrast fill without reload');
}});
// Japan, the Philippines and Malaysia keep their earlier low-contrast fills as legacy colours too.
const firstFill=(p,country)=>p.evaluate(`(()=>{const layer=map.style.getLayer(${JSON.stringify(country+'-first-fill')}),paint=layer.paint.get('fill-color');return paint.evaluate({properties:{id:'-'}},{})})()`);
scenarios.push({name:'Japan, Philippines and Malaysia legacy fills in developer mode',options:{width:1280,height:900,developer:true},async run(p,base){
 for(const [country,legacy,current] of [['japan',[255,253,253],[244,230,231]],['philippines',[231,237,246],[220,229,242]],['malaysia',[245,240,221],[238,230,200]]]){
  await p.open(base,'#'+country);await p.evaluate('AtlasSettings.setSettings({legacyStyling:true})');await p.open(base,'?reload#'+country);await p.waitFor(`!!map.getLayer(${JSON.stringify(country+'-first-fill')})`);
  assert.deepEqual(rgb(await firstFill(p,country)),legacy,country+' legacy fill');
  await toggle(p);assert.deepEqual(rgb(await firstFill(p,country)),current,country+' contrast fill without reload');
 }
}});
export default scenarios;
