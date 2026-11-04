// Checks dist/data/europe/united-states/history/borders.bin against the election results and
// known boundary history, election by election and year by year. With --report it also rewrites
// docs/us-election-borders.md, the year-by-year list of what the historic borders show.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {decodeGeo} from '../dist/geo-pack.mjs';

const root=new URL('../',import.meta.url),dir=new URL('dist/data/europe/united-states/',root);
const history=decodeGeo(new Uint8Array(gunzipSync(readFileSync(new URL('history/borders.bin',dir)))));
const presidential=JSON.parse(gunzipSync(readFileSync(new URL('elections/presidential.bin',dir))));
const manifest=JSON.parse(readFileSync(new URL('scripts/boundary-sources/united-states/historic-states/manifest.json',root),'utf8'));
assert.equal(history.source.sha256,manifest.sha256,'Built from the pinned archive');
const faces=history.faces.features.length,arcs=new Set(history.arcs.features.map(f=>f.properties.a)),runs=history.borders.features;
// Land of the present-day country: the faces assigned in the source's final configuration.
const present=history.configs[history.years[2000].config].face.map((u,i)=>u>=0?i:-1).filter(i=>i>=0);
for(const c of history.configs){
 assert.equal(c.face.length,faces,'Every face is assigned');
 assert(c.lines.every(a=>arcs.has(a))&&c.frontiers.every(a=>arcs.has(a)),'Borders and frontiers are mosaic edges');
 assert(c.borders.every(b=>runs[b]),'Land frontiers are border runs');
 assert(present.filter(i=>c.face[i]<0).length<=4,'All present-day land but the source’s slivers has a holder');
}

const config=year=>history.configs[history.elections[year].config],snapshot=year=>history.configs[history.years[year].config];
const heldIn=(year,state)=>snapshot(year).units[snapshot(year).partOf[state]];
const unitOf=(year,state)=>config(year).units.find(u=>u.state===state);
const partOf=(year,state)=>config(year).units[config(year).partOf[state]];
for(const e of presidential.elections){
 assert(history.elections[e.year],e.year+': has borders');
 const c=config(e.year),used=new Set(c.face.filter(i=>i>=0));
 c.units.forEach((u,i)=>assert(used.has(i),e.year+' '+u.name+': has area'));
 for(const state of [...Object.keys(e.states),...(e.notVoting||[])]){
  const units=c.units.filter(u=>u.state===state);
  assert.equal(units.length,1,e.year+' '+state+': one unit carries the result');
 }
}
// Boundary history the map must show.
assert.equal(partOf(1789,'US-ME').name,'Massachusetts','Maine is part of Massachusetts until 1820');
assert.equal(partOf(1816,'US-ME').name,'Massachusetts');assert.equal(unitOf(1820,'US-ME').name,'Maine');
for(const state of ['US-KY','US-WV'])assert.equal(partOf(1789,state).name,'Virginia',state+' is part of Virginia in 1789');
assert.equal(partOf(1789,'US-TN').name,'North Carolina','Tennessee is part of North Carolina before its 1790 cession');
assert.equal(partOf(1792,'US-TN').name,'Southwest Territory');
assert.equal(partOf(1860,'US-WV').name,'Virginia','West Virginia votes within Virginia in 1860');assert.equal(unitOf(1864,'US-WV').name,'West Virginia');
assert.equal(partOf(1800,'US-MS').name,'Georgia','Georgia reaches the Mississippi until its 1802 cession');
assert.equal(partOf(1844,'US-TX').name,'Republic of Texas');assert.equal(partOf(1848,'US-NM').name,'Texas','Texas claims eastern New Mexico until 1850');
assert.equal(partOf(1852,'US-NM').name,'New Mexico Territory');
assert.equal(partOf(1836,'US-CA').name,'Mexico','California is part of Mexico in 1836');
assert.equal(partOf(1789,'US-LA').name,'Spanish Louisiana');
assert.equal(unitOf(1820,'US-MO').type,'State','Missouri voted in 1820, before its admission, within its state boundary');
assert.equal(partOf(1820,'US-IA').name,'Missouri Territory','The rest of Missouri Territory did not vote');
assert.equal(unitOf(1836,'US-MI').type,'State','Michigan voted in 1836 within its state boundary');
assert.equal(partOf(1812,'US-MO').name,'Louisiana Territory','Louisiana Territory does not take the state of Louisiana\'s result');
assert.equal(partOf(1912,'US-AZ').name,'Arizona');assert.equal(unitOf(1960,'US-HI').name,'Hawaii');
assert(config(1789).units.some(u=>u.key==='disputed:ct_state+nw_terr'),'The Western Reserve is disputed in 1789');
assert(config(1840).units.some(u=>u.key==='disputed:ia_terr+mo_state'),'The Honey War strip is disputed in 1840');
// Who held land before the United States did, in the yearly snapshot.
for(let year=1783;year<=2000;year++)assert(history.years[year],year+': has a snapshot');
const holder=(year,state)=>{const u=heldIn(year,state);return u.name+(u.type==='Foreign'?' ('+u.sovereign+')':'');};
assert.equal(holder(1790,'US-LA'),'Spanish Louisiana (Spain)');assert.equal(holder(1800,'US-LA'),'French Louisiana (France)');assert.equal(holder(1803,'US-LA'),'Louisiana Purchase');
assert.equal(holder(1810,'US-FL'),'Spanish Florida (Spain)');assert.equal(holder(1820,'US-FL'),'Florida (unorganized)');
assert.equal(holder(1820,'US-CA'),'New Spain (Spain)');assert.equal(holder(1821,'US-CA'),'Mexico (Mexico)');assert.equal(holder(1848,'US-CA'),'Mexican Cession');
assert.equal(holder(1850,'US-AZ'),'New Mexico Territory');assert.equal(holder(1852,'US-NV'),'Utah Territory');
assert.equal(holder(1866,'US-AK'),'Russian America (Russia)');assert.equal(holder(1867,'US-AK'),'Alaska Department');
assert.equal(holder(1790,'US-HI'),'Hawaiian Islands (Hawaii)');assert.equal(holder(1850,'US-HI'),'Kingdom of Hawaii (Hawaii)');assert.equal(holder(1896,'US-HI'),'Republic of Hawaii (Hawaii)');assert.equal(holder(1898,'US-HI'),'Hawaii Annexation');
assert.equal(holder(1800,'US-ND'),'French Louisiana (France)');assert(snapshot(1800).units.some(u=>u.name==="Rupert's Land"&&u.sovereign==='Britain'),'The Red River valley is British');assert.equal(holder(1790,'US-WA'),'Oregon Country (Contested)');
// No frontier along today's Mexican border west of Texas while Spain or Mexico held both sides.
const westernMexico=runs.map((f,i)=>i).filter(i=>{const [x,y]=runs[i].geometry.coordinates[0];return y<33&&x<-106.6;});
assert(westernMexico.length>0&&westernMexico.every(i=>!snapshot(1840).borders.includes(i))&&westernMexico.every(i=>snapshot(1860).borders.includes(i)),'The southwestern frontier appears with the Gadsden Purchase');
assert.equal(history.elections[2024].boundaries,manifest.title.match(/(\d+) December (\d{4})/)?'2000-12-31':undefined,'Later elections use the final source configuration');

if(process.argv.includes('--report')){
 const groups=[];
 for(const e of presidential.elections){const y=history.elections[e.year],last=groups.at(-1);if(last?.config===y.config)last.years.push(e.year);else groups.push({config:y.config,years:[e.year],date:y.boundaries||y.date});}
 const list=items=>items.length?items.join(', '):'none';
 const lines=['# US election borders by year','','What "Historic borders" in the Elections view draws for each election, from the Newberry Library\'s dated state and territory boundaries (docs/us-elections.md). Each row covers elections that share one boundary configuration; the date is the first election day of the row (the source ends on 31 December 2000). Land not yet part of the country is listed under the country that held it. Generated by `node scripts/validate-us-historic-borders.mjs --report`.',''];
 for(const g of groups){
  const c=history.configs[g.config],e=presidential.elections.find(x=>x.year===g.years[0]);
  const within=Object.entries(c.partOf).filter(([state,i])=>c.units[i].state!==state).map(([state,i])=>state.slice(3)+' in '+c.units[i].name).sort();
  const other=c.units.filter(u=>!(u.state&&(e.states[u.state]||e.notVoting?.includes(u.state)))&&u.type!=='State').map(u=>u.name).sort();
  const span=g.years.length>1?g.years[0]+'–'+g.years.at(-1):String(g.years[0]);
  lines.push('## '+span,'',
   '- Borders on '+g.date+'; '+c.units.filter(u=>u.type==='State').length+' states.',
   '- Territories and other areas: '+list(other)+'.',
   '- Present-day states inside another unit: '+list(within)+'.','');
 }
 writeFileSync(new URL('docs/us-election-borders.md',root),lines.join('\n'));
}
console.log('US historic borders: '+presidential.elections.length+' elections and '+Object.keys(history.years).length+' yearly snapshots checked against '+history.configs.length+' boundary configurations.');
