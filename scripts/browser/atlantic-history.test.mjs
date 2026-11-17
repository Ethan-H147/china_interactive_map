import assert from 'node:assert/strict';
import {beginPixels,endPixels} from './russia-render-helpers.mjs';
const source=country=>country+'-first';
const modernState=(p,c)=>p.evaluate(`({layers:map.getStyle().layers.filter(l=>l.id.startsWith('${c}-first')).map(l=>l.id).sort(),sources:Object.keys(map.getStyle().sources).filter(id=>id.startsWith('${c}-first')).sort(),paint:map.getPaintProperty('${c}-first-fill','fill-color')})`);
async function enter(p,c){if(p.mobile)await p.evaluate('document.getElementById("historical-snapshot").click()');else await p.tap('#historical-snapshot');await p.waitFor(`currentAtlas().historicalActive&&map.getSource('${source(c)}')?.type==='vector'`,{timeout:60000});await p.settle();}
async function year(p,c,y){await p.evaluate(`document.querySelector('#${c}-history-dock [data-year="${y}"]').click()`);await p.waitFor(`currentAtlas().historicalYear===${y}`);await p.settle();}
async function jump(p,center,zoom=5,bearing=0){await p.evaluate('void map.jumpTo('+JSON.stringify({center,zoom,bearing,padding:{top:0,bottom:0,left:0,right:0}})+')');await p.settle();}
const hover=(p,point)=>p.evaluate(`currentAtlas().hoverAt(map.project(${JSON.stringify(point)}))?.en??null`);
async function click(p,point){await p.tap(await p.evaluate(`(()=>{const q=map.project(${JSON.stringify(point)}),r=map.getCanvas().getBoundingClientRect();return[r.x+q.x,r.y+q.y]})()`));await p.settle();}
async function assertImmutable(p,c,before){
 assert.deepEqual((await modernState(p,c)).layers.filter(id=>id.includes('-first-')),before.layers.filter(id=>id.includes('-first-')),'Existing layer IDs are reused');
 assert(await p.evaluate(`window.historicalSource===map.getSource('${source(c)}')`),'Dates keep the same native source object');
 assert(!(await p.evaluate(`map.getStyle().layers.some(l=>l.id.startsWith('${c}-history-'))`)),'No historical overlay layers');
}
async function allYears(p,c,count){
 const years=await p.evaluate(`[...document.querySelectorAll('#${c}-history-dock [role=option]')].map(n=>+n.dataset.year)`);assert.equal(years.length,count);
 // Render every date. Bounded batches keep the browser automation responsive.
 for(let i=0;i<years.length;i+=8)await p.evaluate(`(async()=>{for(const y of ${JSON.stringify(years.slice(i,i+8))}){document.querySelector('#${c}-history-dock [data-year="'+y+'"]').click();while(currentAtlas().historicalYear!==y)await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);if(window.historicalSource!==map.getSource('${source(c)}'))throw Error('Source changed at '+y);}})()`);
 await p.settle();
}
const noAuthoring=(p,c)=>assert.equal(p.requests.filter(url=>url.includes('/'+c+'/history/')&&/\/(borders|coastal-display|alaska|upper-peninsula)\.bin|\/coasts\//.test(url)).length,0,'No authoring geometry or coast packages are fetched');
export default [
 {name:'US native history renders all 218 dates, preserves province selection and restores modern and election maps',options:{width:1440,height:960},async run(p,base){
  const c='united-states';await p.open(base,'#'+c);await p.evaluate('AtlasComfort.set({appearance:"light"});AtlasContextSourcesController.whenReady()');await p.settle();const before=await modernState(p,c);
  await enter(p,c);await p.evaluate(`void(window.historicalSource=map.getSource('${source(c)}'))`);
  const datedPaint=await p.evaluate(`JSON.stringify(mapScene.basePaint('${source(c)}-fill','fill-color'))`);await p.evaluate('AtlasRegionColorController.setMetric("population")');await p.settle();assert.equal(await p.evaluate(`JSON.stringify(mapScene.basePaint('${source(c)}-fill','fill-color'))`),datedPaint,'Modern statistics colors cannot replace snapshot ownership');await p.evaluate('AtlasRegionColorController.setMetric("none")');
  assert.equal(await p.evaluate('currentAtlas().historicalYear'),1789);assert.match(await p.evaluate('document.querySelector(".history-counts").textContent'),/13 states, 1 territory/);
  await jump(p,[-104,54],4);assert.equal(await hover(p,[-104,54]),"Rupert's Land");
  await year(p,c,1870);assert.notEqual(await hover(p,[-104,54]),"Rupert's Land");
  await year(p,c,1840);await jump(p,[-119.5,37.2],5);await click(p,[-119.5,37.2]);assert.equal(await p.evaluate('document.getElementById("us-name").textContent'),'California');assert.match(await p.evaluate('document.getElementById("us-history-card").textContent'),/Mexico.*Held by Mexico/);
  await p.screenshot('atlantic-us-selected-mexico');
  await year(p,c,1863);await jump(p,[-80.6,38.6],6);await click(p,[-80.6,38.6]);assert.match(await p.evaluate('document.getElementById("us-history-card").textContent'),/West Virginia.*20 June 1863/);
  await year(p,c,1866);await jump(p,[-152,64],4);assert.equal(await hover(p,[-152,64]),'Russian America');await click(p,[-152,64]);assert.match(await p.evaluate('document.getElementById("us-history-card").textContent'),/bought it in 1867/);
  await allYears(p,c,218);await assertImmutable(p,c,before);noAuthoring(p,c);
  await p.tap('#historical-snapshot');await p.settle();assert.deepEqual(await modernState(p,c),before);assert.equal(await p.evaluate(`map.getSource('${source(c)}').type`),'geojson');assert(await p.evaluate('mapScene.assertOrder()'));
  await p.evaluate('currentAtlas().restore("US-CA","elections")');await p.settle();assert.equal(await p.evaluate(`map.getSource('${source(c)}').type`),'geojson','Elections retain their own renderer');
 }},
 {name:'UK native history renders all 319 years, overseas search, Ireland and independence transitions',options:{width:1440,height:960},async run(p,base){
  const c='united-kingdom';await p.open(base,'#'+c);await p.evaluate('AtlasComfort.set({appearance:"light"});AtlasContextSourcesController.whenReady()');await p.settle();const before=await modernState(p,c);await enter(p,c);await p.evaluate(`void(window.historicalSource=map.getSource('${source(c)}'))`);
  assert.equal(await hover(p,[-6.26,53.35]),'Kingdom of Ireland');await year(p,c,1801);assert.equal(await hover(p,[-6.26,53.35]),'Ireland');await year(p,c,1922);assert.equal(await hover(p,[-6.26,53.35]),null);assert.equal(await hover(p,[-5.93,54.6]),'Northern Ireland');
  await year(p,c,1946);await jump(p,[78,23],4);assert.equal(await hover(p,[77.22,28.61]),'British Raj');await year(p,c,1947);assert.equal(await hover(p,[77.22,28.61]),null);
  await year(p,c,1851);await jump(p,[151.235,-33.865],12);assert.equal(await hover(p,[151.21,-33.87]),'New South Wales');assert.equal(await hover(p,[151.243,-33.857]),null);assert.equal(await hover(p,[151.231,-33.8724]),'New South Wales');assert.equal(await hover(p,[151.285,-33.8836]),null);
  await click(p,[151.231,-33.8724]);assert.equal(await p.evaluate('document.getElementById("gb-name").textContent'),'New South Wales');assert(!(await p.evaluate('!!map.getSource("modern-context-detail")')),'Tiled history owns its detailed coast');assert(!(await p.evaluate('[...document.querySelectorAll("[data-atlas-country-label]")].some(n=>n.textContent.startsWith("Australia"))')),'Zooming out removes the modern country label beneath historical territory');await p.screenshot('atlantic-uk-sydney-selected');
  await year(p,c,1942);assert.equal(await hover(p,[151.231,-33.8724]),null);
  await year(p,c,1950);await jump(p,[103.77,1.3],11);assert.equal(await hover(p,[103.85,1.29]),'Singapore');assert.equal(await hover(p,[103.64,1.23]),'Singapore');await year(p,c,1963);assert.equal(await hover(p,[103.85,1.29]),null);
  await year(p,c,1842);await jump(p,[114.175,22.281],12);assert.equal(await hover(p,[114.17,22.275]),'Hong Kong Island');assert.equal(await hover(p,[114.17,22.312]),null);
  await year(p,c,1996);await p.evaluate(`document.getElementById('gb-search').value='Hong Kong';document.getElementById('gb-search').dispatchEvent(new Event('input'))`);await p.waitFor('document.querySelector("#gb-search-results button")?.textContent==="Hong Kong"');await p.tap('#gb-search-results button');await p.settle();assert.equal(await p.evaluate('document.getElementById("gb-name").textContent'),'Hong Kong');assert.equal(await p.evaluate('AtlasCountryMemory.snapshot().active'),'united-kingdom');await year(p,c,1997);assert.equal(await hover(p,[114.17,22.275]),null);
  await allYears(p,c,319);await assertImmutable(p,c,before);noAuthoring(p,c);
  await p.tap('#historical-snapshot');await p.settle();assert.deepEqual(await modernState(p,c),before);assert.equal(await p.evaluate(`map.getSource('${source(c)}').type`),'geojson');assert(await p.evaluate('mapScene.assertOrder()'));
 }},
 {name:'Historical coast pixels and picking survive zoom reversals, globe rotation and selection',options:{width:1440,height:960},async run(p,base){
  await p.open(base,'#united-kingdom');await p.evaluate('AtlasComfort.set({appearance:"light"})');await enter(p,'united-kingdom');
  const cases=[
   {year:1779,center:[-84,29],zoom:5.5,land:[-82,28],name:'East and West Florida',color:[210,156,147],water:[-84,26]},
   {year:1851,center:[151.235,-33.865],zoom:12,land:[151.21,-33.87],name:'New South Wales',color:[210,156,147],water:[151.243,-33.857]},
   {year:1946,center:[79,23],zoom:4.8,land:[79,22],name:'British Raj',color:[210,156,147],water:[84,12]},
   {year:1901,center:[133,-25],zoom:4.5,land:[133.88,-23.7],name:'Commonwealth of Australia',color:[182,156,201],water:[130,-13]},
   {year:1842,center:[174.8,-41.1],zoom:7.5,land:[174.77,-41.29],name:'New Zealand',color:[210,156,147],water:[174.9,-41.5]}
  ];
  for(const test of cases){await year(p,'united-kingdom',test.year);await p.evaluate(`document.getElementById('gb-dated-unit').value='';document.getElementById('gb-dated-unit').dispatchEvent(new Event('change'))`);for(const zoom of [test.zoom,test.zoom+.6,test.zoom]){
   await jump(p,test.center,zoom,7);assert.equal(await hover(p,test.land),test.name);assert.equal(await hover(p,test.water),null);
   const probes=[{lng:test.land[0],lat:test.land[1],color:test.color},{lng:test.water[0],lat:test.water[1],color:[237,240,246]}];
   await beginPixels(p,probes);await p.evaluate('map.triggerRepaint()');await p.settle();const result=await endPixels(p);assert(result.points>=2);assert.equal(result.bad,0,JSON.stringify(result));
  }await click(p,test.land);await p.screenshot('atlantic-uk-'+test.year+'-coast');await p.evaluate('currentAtlas().selectDated?.("")');}
 }},
 {name:'Phone historical controls, appearances and repeated country changes',options:{width:390,height:844,mobile:true},async run(p,base){
  for(const [country,yearValue,last]of [['united-states',1840,2000],['united-kingdom',1851,2025],['united-states',1866,2000]]){
   await p.open(base,'#'+country);await enter(p,country);await year(p,country,yearValue);assert.equal(await p.evaluate(`map.getSource('${country}-first').type`),'vector');assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
   await year(p,country,last);await p.evaluate('AtlasComfort.set({appearance:"dark"})');await p.settle();assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));await p.screenshot('atlantic-'+country+'-phone');await p.evaluate('AtlasComfort.set({appearance:"light"})');
  }
 }}
];
