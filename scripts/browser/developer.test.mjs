import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
// Developer mode opens from Changning by typing "dev mode". The European countries, once behind
// it, are public: each opens directly and loads to its deepest level.
const desktop={width:1280,height:820};
const europe=['united-kingdom','spain','france','italy'];

export default [
 {name:'the European countries are public',options:desktop,async run(page,base){
  for(const country of europe){
   await page.open(base,'#'+country);
   assert.equal(await page.evaluate('AtlasEntry.current'),country,country+' opens without developer mode');
  }
  // A first view elsewhere does not wait for Europe's previews; they follow it.
  await page.open(base,'#korea');
  await page.waitFor(`!!map.getLayer('united-kingdom-portal-fill')`,{label:"Europe's previews after the first view",timeout:30000});
 }},
 {name:'Changning unlocks developer mode',options:desktop,async run(page,base){
  await page.open(base,'#china');
  await searchAndSelect(page,'Changning','Changning','Shanghai');
  assert.equal(await page.evaluate(`selected?.layer.feature.properties.adcode`),310105,'Shanghai Changning is selected');
  await page.evaluate(`document.activeElement?.blur()`);
  await page.type('dev mode');
  await page.waitFor(`document.getElementById('developer-dialog')?.open`,{label:'the developer dialog'});
  await page.tap('.developer-continue');
  // China then loads every county-level division in the background.
  await page.waitFor(`AtlasDev.enabled&&chinaCounties`,{label:"China's counties",timeout:60000});
  assert.equal(await page.evaluate('AtlasDev.enabled'),true);
  // Unreleased countries' portals load after every first view, so they draw at once (Chile beside Argentina).
  assert(await page.evaluate(`['chile','peru','paraguay','india','turkey','iceland'].every(c=>!!map.getLayer(c+'-portal-fill'))`),'Unreleased portals are ready when developer mode opens');
  await page.evaluate(`location.hash='#italy'`);await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'italy','Italy opens in developer mode');
 }},
 ...[['italy','Bergamo','Bergamo','Comune'],['spain','Llívia','Llívia','Municipality'],['france','Fleury-devant','Fleury-devant-Douaumont','Commune'],['united-kingdom','Maidstone','Maidstone','District'],['united-kingdom','Cardiff','Cardiff','built-up area']].map(([country,query,pick,kind])=>({
  name:`${country}: ${pick} (${kind})`,options:desktop,async run(page,base){
   await page.open(base,'#'+country);
   assert.equal(await page.evaluate('AtlasEntry.current'),country);
   await searchAndSelect(page,query,pick,kind);
   assert(await page.evaluate(`[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none').innerText.includes('Population')`),'The statistics card shows');
  }})),
 // A shared link reopens the same place at its own level, with the chosen label language.
 ...[['spain','Llívia','Llívia','Municipality',null],['united-kingdom','Maidstone','Maidstone','District','cy']].map(([country,query,pick,kind,language])=>({
  name:`${country}: a link keeps ${pick} at its level`,options:desktop,async run(page,base){
   await page.open(base,'#'+country);
   await searchAndSelect(page,query,pick,kind);
   if(language)await page.evaluate(`currentAtlas().setLanguage('${language}')`);
   const before=await page.evaluate('({mode:currentAtlas().getMode(),selection:currentAtlas().getSelection(),hash:AtlasView.hashFor(captureView())})');
   assert.equal(before.mode,3,'The place is shown at the third level');
   await page.send('Page.navigate',{url:'about:blank'});
   await page.open(base,before.hash);
   await page.waitFor(`(()=>{const c=document.getElementById('breadcrumb-region');return c&&!c.hidden&&c.textContent.includes(${JSON.stringify(pick)});})()`,{label:'the breadcrumb to show '+pick,timeout:20000});
   const after=await page.evaluate('({mode:currentAtlas().getMode(),selection:currentAtlas().getSelection(),language:currentAtlas().getLanguage?.(),third:document.getElementById("mode-third")?.getAttribute("aria-pressed")})');
   assert.equal(after.selection,before.selection,'The same place is selected');
   assert.equal(after.mode,3,'The third level is restored');assert.equal(after.third,'true','The third-level button shows as chosen');
   if(language)assert.equal(after.language,language,'The label language is restored');
  }})),
 // Flags stack downward: national, region or community, then department or province. A commune
 // or municipality shows its department's or province's flag, captioned as such.
 ...[
  ['france','Strasbourg','Strasbourg','Commune',['flag-fr.svg','FR-R-44','FR-D-67'],'Bas-Rhin · Department flag'],
  ['france','Bas-Rhin','Bas-Rhin','Department',['flag-fr.svg','FR-R-44','FR-D-67'],''],
  ['france','Chambéry','Chambéry','Commune',['flag-fr.svg','FR-R-84'],''],
  ['spain','Toledo','Toledo','Province',['flag-es.svg','ES-A-08','ES-P-45'],''],
  ['spain','Alcalá de Henares','Alcalá de Henares','Municipality',['flag-es.svg','ES-A-13'],''],
  ['spain','Tarragona','Tarragona','Municipality',['flag-es.svg','ES-A-09','ES-P-43'],'Tarragona · Province flag'],
  ['italy','Gallarate','Gallarate','Comune',['flag-it.svg','IT-R-03','IT-P-12'],'Varese · Province flag'],
  ['italy','Turin','Turin','Metropolitan city',['flag-it.svg','IT-R-01'],''],
  ['united-kingdom','Maidstone','Maidstone','District',['flag-gb.svg','GB-R-TLJ'],''],
  ['united-kingdom','Edinburgh','Edinburgh','Council area',['flag-gb.svg','GB-R-TLM'],''],
  ['united-kingdom','Belfast','Belfast','Local government district',['flag-gb.svg'],'']
 ].map(([country,query,pick,kind,flags,caption])=>({name:`${country}: ${pick} shows its flags`,options:desktop,async run(page,base){
  await page.open(base,'#'+country);
  await searchAndSelect(page,query,pick,kind);
  const sidebar=`[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none')`;
  await page.waitFor(`[...${sidebar}.querySelectorAll('.division-flags img')].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0)`,{label:'the flags to load'});
  const shown=await page.evaluate(`[...${sidebar}.querySelectorAll('.division-flags img')].filter(i=>i.getClientRects().length).map(i=>({src:i.getAttribute('src'),top:i.getBoundingClientRect().top}))`);
  assert.deepEqual(shown.map(i=>flags.find(f=>i.src.includes(f))),flags,'Flags shown, top to bottom: '+shown.map(i=>i.src).join(', '));
  assert(shown.every((i,n)=>!n||i.top>shown[n-1].top),'The flags stack downward');
  assert.equal(await page.evaluate(`(()=>{const c=${sidebar}.querySelector('.flag-caption');return c&&!c.hidden?c.textContent:'';})()`),caption);
 }})),
 // Overseas territories: a click on one from another country opens it directly, selected and
 // filling the screen; the home country's own views ignore its far-off territories.
 ...[['Gibraltar','united-kingdom','GB-O-GI',[-5.348,36.13],13],['Réunion','france','FR-R-04',[55.53,-21.13],9]].map(([name,country,id,at,zoom])=>({name:`a click on ${name} from China opens it`,options:desktop,async run(page,base){
  await page.open(base,'#china');
  const point=await page.evaluate(`(()=>{map.jumpTo({center:${JSON.stringify(at)},zoom:${zoom}});const p=map.project(${JSON.stringify(at)}),r=map.getCanvas().getBoundingClientRect();return [r.left+p.x,r.top+p.y];})()`);
  await page.settle();await page.tap(point);await page.settle();
  await page.waitFor(`AtlasEntry.current===${JSON.stringify(country)}&&currentAtlas()?.getSelection()===${JSON.stringify(id)}`,{label:name+' selected in '+country,timeout:30000});
  const view=await page.evaluate(`(()=>{const r=currentAtlas().getSelection(),b=map.getBounds();return {zoom:map.getZoom(),center:map.getCenter().toArray(),crumb:document.getElementById('breadcrumb-region').textContent,span:b.getEast()-b.getWest()};})()`);
  assert(view.crumb.includes(name),'The breadcrumb names '+name);
  assert(Math.abs(view.center[0]-at[0])<1&&Math.abs(view.center[1]-at[1])<1,'The camera is on '+name+', not the home country: '+view.center);
  assert(view.span<3,'The territory fills the screen ('+view.span.toFixed(2)+'° wide)');
 }})),
 {name:"France's home view ignores its overseas territories",options:desktop,async run(page,base){
  await page.open(base,'#france');
  const c=await page.evaluate('map.getCenter().toArray()');
  assert(c[0]>-6&&c[0]<10&&c[1]>41&&c[1]<52,'The camera frames metropolitan France: '+c);
  await searchAndSelect(page,'Brittany','Brittany','Region');
  const b=await page.evaluate('(()=>{const b=map.getBounds();return [b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];})()');
  assert(b[0]>-10&&b[2]<5,'A metropolitan region frames itself only: '+b);
 }},
 {name:"the Falklands stay Argentina's own drawing while Argentina is open",options:desktop,async run(page,base){
  await page.open(base,'#argentina');
  const point=await page.evaluate(`(()=>{map.jumpTo({center:[-59,-51.7],zoom:7});const p=map.project([-59,-51.7]),r=map.getCanvas().getBoundingClientRect();return [r.left+p.x,r.top+p.y];})()`);
  await page.settle();
  assert.equal(await page.evaluate(`map.queryRenderedFeatures(map.project([-59,-51.7]),{layers:['united-kingdom-portal-fill']}).length`),0,"The UK's Falklands are hidden while Argentina is open");
  for(const [island,p] of [['West Falkland',[-60,-51.75]],['East Falkland',[-58.5,-51.75]],['Stanley',[-57.95,-51.7]]])assert(await page.evaluate(`map.queryRenderedFeatures(map.project(${JSON.stringify(p)})).some(f=>f.layer.id==='south-argentina-fill'&&f.properties.id==='AR-94')`),island+' is drawn in Tierra del Fuego');
  await page.tap(point);await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'argentina','A click stays in Argentina');
  await page.evaluate(`location.hash='#china'`);await page.settle();
  const again=await page.evaluate(`(()=>{map.jumpTo({center:[-59,-51.7],zoom:7});const p=map.project([-59,-51.7]),r=map.getCanvas().getBoundingClientRect();return [r.left+p.x,r.top+p.y];})()`);
  await page.settle();await page.tap(again);
  await page.waitFor(`AtlasEntry.current==='united-kingdom'&&currentAtlas()?.getSelection()==='GB-O-FK'`,{label:'the Falklands in the UK',timeout:30000});
 }},
 {name:'the globe button stands apart from the zoom controls',options:desktop,async run(page,base){
  await page.open(base,'#china');
  assert(await page.evaluate(`(()=>{const b=document.getElementById('globe-view');return !b.hidden&&!b.closest('.map-actions')&&b.getClientRects().length>0;})()`),'Everyone sees the globe button, outside the zoom bar');
  assert.equal(await page.evaluate(`map.getProjection().type`),'mercator','The map starts flat');
 }},
 {name:'the globe button switches the map to a globe and back',options:desktop,async run(page,base){
  await page.open(base,'#china');
  await page.tap('#globe-view');await page.settle();
  assert.equal(await page.evaluate(`map.getProjection().type`),'globe');
  assert.equal(await page.evaluate(`document.getElementById('globe-view').getAttribute('aria-pressed')`),'true');
  // Labels stay on the visible side of the globe.
  await page.evaluate(`map.jumpTo({center:[105,35],zoom:1.6});0`);await page.settle();
  // Zooming out stops while the globe still roughly fills the map.
  assert(await page.evaluate('map.getMinZoom()>1.5'),'The globe has a size floor');
  await page.waitFor(`document.querySelectorAll('[data-atlas-place]').length>=3`,{label:'labels on the near side'});
  assert(!await page.evaluate(`[...document.querySelectorAll('[data-atlas-place]')].some(el=>el.textContent.includes('United Kingdom'))`),'A country at the edge of the globe is not labelled');
  await page.evaluate(`location.hash='#france'`);await page.settle();
  assert.equal(await page.evaluate(`map.getProjection().type`),'globe','The globe stays on across countries');
  await page.open(base,'#china');
  assert.equal(await page.evaluate(`map.getProjection().type`),'globe','The choice is remembered on the next visit');
  await page.tap('#globe-view');await page.settle();
  assert(await page.evaluate(`map.getProjection().type==='mercator'&&map.getMinZoom()===.5`),'The button returns to the flat map');
 }},
 {name:'Iceland, India and Turkey wait in developer mode',options:desktop,async run(page,base){
  for(const country of ['iceland','india','turkey']){
   await page.open(base,'#'+country);
   assert.equal(await page.evaluate('AtlasEntry.current'),'china',country+' falls back to China for the public');
  }
 }},
 ...[['iceland','Kópavogur','IS-M-1000','Capital Region'],['turkey','Çankaya',null,'Ankara']].map(([country,query,id,parent])=>({name:`${country}: ${query} opens in developer mode`,options:{...desktop,developer:true},async run(page,base){
  await page.open(base,'#'+country);
  assert.equal(await page.evaluate('AtlasEntry.current'),country);
  await searchAndSelect(page,query,query);
  await page.waitFor(`!!currentAtlas()?.getSelection()`,{label:query+' selected'});
  const selection=await page.evaluate('currentAtlas().getSelection()');
  if(id)assert.equal(selection,id);else assert(selection.startsWith('TR-D-'),query+' is a district: '+selection);
  assert(await page.evaluate(`[...document.querySelectorAll('.map-breadcrumb')].some(b=>b.getClientRects().length&&b.textContent.includes(${JSON.stringify(parent)}))`),query+' sits under '+parent);
  // Iceland's towns and Turkey's province-centre cities are dots of their own.
  await page.waitFor(`map.getSource('${country}-settlements')&&map.querySourceFeatures('${country}-settlements').length>0`,{label:country+' settlement dots'});
 }})),
 // Chile, Paraguay and Peru: their lowest units, under their parents; Chile and Peru show capitals.
 ...[['chile','Pozo Almonte','CL-C-01401','Tamarugal',true],['paraguay','Lambaré','PY-T-1107','Central',false],['peru','Barranco','PE-D-150104','Lima',true]].map(([country,query,id,parent,capitals])=>({name:`${country}: ${query} opens in developer mode`,options:{...desktop,developer:true},async run(page,base){
  await page.open(base,'#'+country);
  assert.equal(await page.evaluate('AtlasEntry.current'),country);
  await searchAndSelect(page,query,query);
  await page.waitFor(`currentAtlas()?.getSelection()===${JSON.stringify(id)}`,{label:query+' selected'});
  assert(await page.evaluate(`[...document.querySelectorAll('.map-breadcrumb')].some(b=>b.getClientRects().length&&b.textContent.includes(${JSON.stringify(parent)}))`),query+' sits under '+parent);
  if(capitals)await page.waitFor(`!!map.getSource('${country}-settlements')&&!!map.getLayer('${country}-settlements')`,{label:country+' capitals'});
 }})),
 {name:'india: Sikkim opens in developer mode',options:{...desktop,developer:true},async run(page,base){
  await page.open(base,'#india');
  assert.equal(await page.evaluate('AtlasEntry.current'),'india');
  await searchAndSelect(page,'Sikkim','Sikkim');
  await page.waitFor(`currentAtlas()?.getSelection()==='IN-SK'`,{label:'Sikkim selected'});
 }},
 // China and India both claim Aksai Chin and Arunachal Pradesh: each map draws its own claim.
 {name:'China and India each draw their own claim',options:{...desktop,developer:true},async run(page,base){
  const hides=(layer,country)=>page.evaluate(`JSON.stringify(map.getFilter('${layer}')||null).includes('"claimedBy"],""],"${country}"')`);
  await page.open(base,'#china');
  await page.waitFor(`!!map.getLayer('india-portal-fill')&&!!map.getLayer('india-international')`,{label:'India portal'});
  await page.evaluate(`map.jumpTo({center:[86,29],zoom:4.4});0`);await page.settle();
  assert(await page.evaluate(`map.querySourceFeatures('india-portal').some(f=>f.properties.claimedBy==='china')`),'India portal carries the claims China holds');
  for(const layer of ['india-portal-fill','india-international','atlas-frontiers'])assert(await hides(layer,'china'),layer+' hides China-held claims while China is open');
  await page.open(base,'#india');
  assert(await hides('atlas-frontiers','india'),"China's claim lines inside India's outline hide while India is open");
 }},
 // Developer mode draws every county-level division of mainland China; the public map keeps
 // its five-city overlay.
 {name:'China shows every county-level division in developer mode',options:{...desktop,developer:true},async run(page,base){
  await page.open(base,'#china');
  await page.waitFor('chinaCounties',{label:"China's counties",timeout:60000});
  await searchAndSelect(page,'Chengdu','Chengdu');
  await page.waitFor(`map.getLayer('city-district-fill')&&map.getLayoutProperty('city-district-fill','visibility')==='visible'&&map.querySourceFeatures('city-districts',{filter:['==',['get','parentCity'],510100]}).length>=20`,{label:"Chengdu's counties"});
  await searchAndSelect(page,'Pidu','Pidu District');
  assert.equal(await page.evaluate('selected?.layer.feature.properties.adcode'),510117,'Pidu District is selected');
  assert(await page.evaluate(`[...document.querySelectorAll('.map-breadcrumb')].some(b=>b.getClientRects().length&&b.textContent.includes('Chengdu'))`),'Pidu sits under Chengdu');
 }},
 {name:'the public China keeps its five-city districts',options:desktop,async run(page,base){
  await page.open(base,'#china');
  assert.equal(await page.evaluate('chinaCounties'),false);
  assert.equal(await page.evaluate('districtCities.size'),5);
  assert(!page.requests.some(url=>/china-(counties|county-names)/.test(url)),'The public map downloads none of the county data');
 }}
];
