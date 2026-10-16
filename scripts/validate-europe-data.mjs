import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {configurations} from '../dist/europe.mjs';

// Outline-only countries: one level-1 region per country, drawn land frontiers, no coastlines.
const root='dist/data/europe',read=(c,n)=>JSON.parse(gunzipSync(fs.readFileSync(root+'/'+c+'/'+n)));
const countries=['united-kingdom','spain','france','italy','iceland','india','chile','paraguay','peru','turkey'];
// Countries reconciled with outlines drawn outside this build, and the countries whose claims
// their portals carry apart.
const claimsAgainst={india:['china'],chile:['argentina'],paraguay:['argentina','brazil'],peru:[]};
assert.deepEqual(Object.keys(configurations),countries);
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
function inRing(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(a[1]>p[1]!==b[1]>p[1]&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const contains=(g,p)=>polygons(g).some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(hole=>inRing(p,hole)));
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
const outline={},lines={};
// Land frontier lengths, excluding the France–Spain and France–Italy seams France holds.
const frontierKm={'united-kingdom':[620,670],spain:[1300,1400],france:[4100,4250],italy:[1380,1450],iceland:[0,0],india:[13300,13500],chile:[1350,1600],paraguay:[740,800],peru:[3150,3350],turkey:[2800,3000]};
// Pieces: Ireland and Cyprus (Akrotiri, Dhekelia in four pieces, its two Cypriot enclaves);
// Portugal, Andorra, Ceuta, Melilla, Gibraltar; Pyrenees, Monaco, Alps, Geneva to the North Sea,
// Llívia, French Guiana (Suriname, Brazil, and five short pieces at the Brazilian tripoint),
// Saint-Martin; Slovenia to Mont Dolent, San Marino, Vatican, Campione.
// Turkey: Greece and Bulgaria from the Aegean to the Black Sea; Georgia to Syria from the Black
// Sea to the Mediterranean. Iceland has no land frontier.
const pieces={'united-kingdom':8,spain:5,france:13,italy:4,iceland:0,india:58,chile:17,paraguay:3,peru:56,turkey:2};
// The six Meuse villages destroyed at Verdun in 1916 remain communes with no inhabitants.
const zeroPopulation=new Set(['FR-C-55039','FR-C-55050','FR-C-55139','FR-C-55189','FR-C-55239','FR-C-55307']);
// Subdivided countries: levels, unit counts, and which levels arrive together in all.bin.
// Spain's condominiums and the islets under central administration have no registered population.
const subdivided={'united-kingdom':{levels:['Nation or region','County or unitary authority','District'],counts:{1:28,2:226,3:164},bundled:3,noPopulation:r=>['GB-O-IO','GB-O-GS','GB-O-SH-AC','GB-O-SBA','GB-O-SBA-A','GB-O-SBA-D'].includes(r.id)},france:{levels:['Region','Department','Commune'],counts:{1:26,2:191,3:34875},bundled:2,noPopulation:r=>/^FR-(R-98[49]|T-)/.test(r.id)},italy:{levels:['Region','Province','Comune'],counts:{1:20,2:110,3:7896},bundled:2},iceland:{levels:['Region','Municipality'],counts:{1:8,2:61},bundled:2},india:{levels:['State or union territory'],counts:{1:36},bundled:1},chile:{levels:['Region','Province','Commune'],counts:{1:16,2:56,3:345},bundled:2},paraguay:{levels:['Department','District'],counts:{1:18,2:263},bundled:2},peru:{levels:['Department','Province','District'],counts:{1:25,2:196,3:1873},bundled:2},turkey:{levels:['Statistical region','Province','District'],counts:{1:12,2:81,3:973},bundled:2},spain:{levels:['Autonomous community','Province','Municipality'],counts:{1:20,2:53,3:8219},bundled:2,noPopulation:r=>r.id.startsWith('ES-T-')||['ES-A-20','ES-P-54'].includes(r.id)||r.parent==='ES-P-54'}};
for(const country of countries){
 const catalogue=read(country,'catalogue.bin'),first=read(country,'first.bin'),context=read(country,'context.bin');
 // The portal: the home territory, then each overseas territory with its id and bounds.
 assert(context.features.every(f=>f.properties.country===country),country+' portal features');
 assert(!context.features[0].properties.region,country+' portal starts with the home territory');
 // India's portal adds the land both India and China claim, hidden while China's map is open.
 const territories=context.features.slice(1).filter(()=>!claimsAgainst[country]);
 if(claimsAgainst[country])assert(context.features.slice(1).every(f=>claimsAgainst[country].includes(f.properties.claimedBy)),country+' portal: home, then the claims its references hold');
 if(country==='india'||country==='chile')assert(context.features.length>1,country+' has claims shared with '+claimsAgainst[country]);
 for(const t of territories){const r=catalogue.records.find(r=>r.id===t.properties.region);assert(r?.overseas&&r.level===1,t.properties.region+' is an overseas territory');assert.deepEqual(t.properties.bounds,[...r.bounds[0],...r.bounds[1]],r.id+' portal bounds');}
 assert.equal(territories.length,catalogue.records.filter(r=>r.overseas).length,country+' every overseas territory has its own portal shape');
 assert.deepEqual(territories.filter(t=>t.properties.claimedBy).map(t=>t.properties.region+':'+t.properties.claimedBy),country==='united-kingdom'?['GB-O-FK:argentina']:[],'Only the Falklands are drawn by another atlas country');
 outline[country]=context.features.length===1?context.features[0].geometry:{type:'MultiPolygon',coordinates:context.features.flatMap(f=>polygons(f.geometry))};
 const s=subdivided[country];
 if(!s){
  assert.deepEqual(catalogue.levels,['Country']);assert.equal(catalogue.records.length,1);assert.deepEqual(catalogue.counts,{1:1});
  const [record]=catalogue.records;assert.equal(record.level,1);assert.equal(record.parent,null);assert.deepEqual(record.bounds,configurations[country].bounds,country+' selection frames the configured bounds');
  assert.equal(first.regions.features.length,1);assert.equal(first.regions.features[0].properties.id,record.id);assert.equal(first.boundaries.features.length,0);
  // Same polygons; their order may differ (the frontier alignment sorts France's list).
  const shapes=g=>polygons(g).map(p=>JSON.stringify(p)).sort();
  assert.deepEqual(shapes(first.regions.features[0].geometry),shapes(outline[country]),country+' region and silhouette are the same outline');
 }else{
  assert.deepEqual(catalogue.levels,s.levels);assert.deepEqual(catalogue.counts,s.counts);
  const ids=new Map(catalogue.records.map(r=>[r.id,r]));assert.equal(ids.size,catalogue.records.length,country+' unique ids');
  for(const r of catalogue.records){assert(r.en&&r.kind&&r.center.every(Number.isFinite)&&r.areaKm2>0,r.id+' record');if(r.level>1)assert.equal(ids.get(r.parent)?.level,r.level-1,r.id+' parent one level up');}
  assert.equal(first.regions.features.length,s.counts[1]);assert(first.boundaries.features.length>0);
  const bundle=s.bundled>1?read(country,'all.bin'):{levels:[]};if(s.bundled>1)assert.deepEqual(bundle.levels.map(l=>l.level),Array.from({length:s.bundled},(_,i)=>i+1));
  for(const l of bundle.levels)assert.equal(l.regions.features.length,s.counts[l.level],country+' bundle level '+l.level);
  // Every unit below level 1 is in exactly one chunk, under its own parent.
  for(let level=2;level<=s.levels.length;level++){
   const chunks=Object.entries(catalogue.chunks).filter(([,c])=>c.level===level);let total=0;
   for(const [parent,c] of chunks){const data=read(country,c.file);total+=data.regions.features.length;for(const f of data.regions.features)assert.equal(ids.get(f.properties.id).parent,parent,f.properties.id+' chunk parent');}
   assert.equal(total,s.counts[level],country+' level '+level+' chunks hold every unit');
  }
  // Statistics: population and area for every unit; parents sum their children.
  const statistics=JSON.parse(fs.readFileSync(root+'/'+country+'/statistics.json')),stats=statistics.regions;
  for(const r of catalogue.records){const m=stats[country+':'+r.id];assert(m?.area?.value>0,r.id+' area');assert.equal(Number.isInteger(m.population?.value),!s.noPopulation?.(r),r.id+' population where one is registered');if(m.population)assert(m.population.value>0||zeroPopulation.has(r.id),r.id+' populated');for(const metric of [m.population,m.area,m.gdp,m.gdpPerCapita].filter(Boolean))assert(statistics.sources[metric.source],r.id+' cites a listed source');}
  for(const r of catalogue.records.filter(r=>r.level<s.levels.length&&!s.noPopulation?.(r)&&catalogue.records.some(c=>c.parent===r.id))){const sum=catalogue.records.filter(c=>c.parent===r.id).reduce((t,c)=>t+(stats[country+':'+c.id].population?.value||0),0);assert.equal(stats[country+':'+r.id].population.value,sum,r.id+' population sums its children');}
  if(country==='united-kingdom'){
   const home=catalogue.records.filter(r=>r.level===1&&!r.overseas);
   assert.equal(home.reduce((s,r)=>s+stats['united-kingdom:'+r.id].population.value,0),69281437,'UK mid-2024 total');
   for(const r of home)assert(stats['united-kingdom:'+r.id].gdp,r.id+' ITL1 GDP');
   for(const [id,value] of [['GB-O-GI',37936],['GB-O-FK',3662],['GB-X-JE',104490],['GB-X-IM',84069],['GB-X-GG',67720]])assert.equal(stats['united-kingdom:'+id].population.value,value,id+' population');
   for(const id of ['GB-O-IO','GB-O-GS','GB-O-SBA'])assert(!stats['united-kingdom:'+id].population&&stats['united-kingdom:'+id].note,id+' explains its missing population');
   // Cities and towns: points independent of councils, each inside the authority it names.
   const places=JSON.parse(fs.readFileSync(root+'/united-kingdom/settlements.json')).records;
   assert(places.length>4000,'A large list of cities and towns');assert(places.every(p=>p.population.value>=1000&&ids.get(p.parentId)&&ids.get(p.provinceId)?.level===1),'Settlements have population and parents');
   for(const [name,nation] of [['Birmingham','E'],['Greater Glasgow','S'],['Edinburgh','S'],['Cardiff','W'],['Belfast','N'],['Croydon','E']])assert(places.some(p=>p.en===name&&p.id.startsWith('GB-S-'+nation)),name+' is a settlement');
   assert.equal(places.find(p=>p.en==='Cardiff').names.cy.name,'Caerdydd');
   assert.equal(new Set(places.map(p=>p.center.join())).size,places.length,'No two dots share a location');
  }
  if(country==='france'){
   assert.equal(stats['france:FR-C-75056'].population.value,stats['france:FR-D-75'].population.value,'Paris is one commune and one department');
   for(const city of ['FR-C-75056','FR-C-69123','FR-C-13055'])assert(stats['france:'+city].population.value>500000,city+' sums its arrondissements');
   // Regions and départements, overseas ones included, have Eurostat GDP; the collectivities do not.
   for(const r of catalogue.records.filter(r=>r.level<=2&&/^FR-[RD]-ddd?$/.test(r.id)&&!/^FR-R-9/.test(r.id)))assert(stats['france:'+r.id].gdp,r.id+' GDP');
   for(const [id,value] of [['FR-R-06',323153],['FR-R-987',278786],['FR-R-988',264596],['FR-R-986',11151]])assert.equal(stats['france:'+id].population.value,value,id+' population');
   for(const id of ['FR-R-984','FR-R-989','FR-T-KER'])assert(!stats['france:'+id].population,id+' has no permanent population');
   const llivia=polygons(outline.france).flatMap(p=>p.slice(1)).length;assert(llivia>=1,'France keeps the Llívia hole');
   // French Guiana's neighbours meet its frontier: just beyond every frontier point lies drawn
   // Surinamese or Brazilian land, never a gap.
   const neighbours=read('france','neighbours.bin').features,guiana=context.features.find(f=>f.properties.region==='FR-R-03').geometry;
   assert.deepEqual(neighbours.map(f=>f.properties.country).sort(),['brazil','suriname']);
   const frontier=read('france','international.bin').features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates).filter(l=>l[0][0]<-50&&l[0][0]>-56);
   let probes=0,covered=0;
   for(const line of frontier)for(let i=5;i<line.length-5;i+=10){const [a,b]=[line[i-1],line[i+1]],c=Math.cos(line[i][1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)continue;
    for(const side of [1,-1]){const p=[line[i][0]-dy/len*side*150/111195/c,line[i][1]+dx/len*side*150/111195];if(contains(guiana,p))continue;probes++;if(neighbours.some(f=>contains(f.geometry,p)))covered++;}}
   assert(probes>300&&covered/probes>.99,'Guiana neighbours meet the frontier: '+covered+'/'+probes);
  }
  if(country==='spain'){
   assert(!ids.has('ES-M-54006'),'Gibraltar is not mapped as Spanish');
   const madrid=stats['spain:ES-M-28079'].population.value;assert(madrid>3.4e6&&madrid<3.7e6,'Madrid municipality');
   for(const r of catalogue.records.filter(r=>r.level<=2))assert.equal(!!stats['spain:'+r.id].gdp,!['ES-A-20','ES-P-54'].includes(r.id),r.id+' GDP');
   const llivia=read('spain','third/ES-P-17.bin').regions.features.find(f=>f.properties.id==='ES-M-17094');assert(llivia&&contains(llivia.geometry,[1.985,42.462]),'Llívia municipality fills the enclave');
  }
  if(country==='italy'){
   assert.equal(stats['italy:IT-C-058091'].population.value>2.6e6&&stats['italy:IT-C-058091'].area.value>1280,true,'Rome comune');
   const sardinia=new Set(catalogue.records.filter(r=>r.parent==='IT-R-20').map(r=>r.id));
   for(const r of catalogue.records.filter(r=>r.level<=2))assert.equal(!!stats['italy:'+r.id].gdp,!sardinia.has(r.id),r.id+' GDP only where Eurostat territories match');
  }
 }
 lines[country]=read(country,'international.bin').features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates);
 const km=lines[country].reduce((s,p)=>s+p.slice(1).reduce((t,q,i)=>t+metres(p[i],q),0),0)/1000;
 assert(km>=frontierKm[country][0]&&km<=frontierKm[country][1],country+' land frontier '+km.toFixed(0)+' km');
 const joined=[];for(const p of lines[country]){const last=joined.at(-1);if(last&&metres(last.at(-1),p[0])<1)last.push(...p.slice(1));else joined.push([...p]);}
 assert.equal(joined.length,pieces[country],country+' frontier is continuous: '+joined.length+' pieces');
 const sources=JSON.parse(fs.readFileSync(root+'/'+country+'/sources.json'));assert(sources.sources.every(s=>s.sha256&&s.license),country+' sources are pinned and licensed');
}
// Enclaves, microstates and exclaves.
assert(contains(outline.spain,[1.985,42.462])&&!contains(outline.france,[1.985,42.462]),'Llívia is Spanish inside France');
for(const [name,p] of [['San Marino',[12.45,43.94]],['Vatican City',[12.453,41.904]]])assert(!contains(outline.italy,p),name+' is not Italian');
assert(!contains(outline.france,[7.42,43.737]),'Monaco is not French');
for(const country of ['france','spain'])assert(!contains(outline[country],[1.52,42.55]),'Andorra is outside '+country);
for(const [country,p] of [['united-kingdom',[-1.5,52.5]],['united-kingdom',[-6.6,54.6]],['spain',[-3.7,40.4]],['spain',[-15.6,28.1]],['france',[2.35,48.85]],['france',[9.1,42.1]],['italy',[12.5,41.85]],['italy',[14,37.5]]])assert(contains(outline[country],p),country+' contains '+p);
// France holds its seams with Spain and Italy, which therefore touch exactly.
const near=(paths,p,limit)=>paths.some(path=>path.some((q,i)=>i&&(()=>{const a=path[i-1],c=Math.cos(p[1]*Math.PI/180),dx=(q[0]-a[0])*c,dy=q[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return metres(p,[a[0]+u*(q[0]-a[0]),a[1]+u*(q[1]-a[1])])<limit;})()));
for(const [p,label] of [[[-0.7,42.8],'Pyrenees'],[[7.0,45.9],'Mont Blanc'],[[7.6,44.15],'Maritime Alps']])assert(near(lines.france,p,8000),'France draws the '+label+' frontier');
for(const country of ['spain','italy']){let shared=0;for(const path of lines[country])for(const p of path)if(near(lines.france,p,1))shared++;assert(shared<=4,country+' does not redraw France\'s frontier ('+shared+' points)');}
// Coastlines carry no stroke.
for(const [country,p,place] of [['united-kingdom',[1.33,51.13],'Dover'],['france',[-1.56,43.48],'Biarritz'],['spain',[-1.78,43.39],'Hondarribia'],['italy',[7.53,43.79],'Ventimiglia'],['spain',[-5.35,36.14],'La Línea'],['italy',[13.755,45.607],'Muggia bay'],['italy',[13.715,45.602],'Punta Sottile'],['france',[7.40,43.722],'Cap d’Ail'],['france',[7.447,43.751],'Roquebrune'],['spain',[-5.416,35.913],'Perejil'],['united-kingdom',[-6.2,54.05],'Carlingford Lough mouth']])assert(!near(lines[country],p,250),place+' shore is not outlined');
// Frontiers reach the coast where OpenStreetMap's land border ways do.
for(const [country,p,place] of [['italy',[13.7228,45.5947],'Lazzaretto'],['france',[7.4185,43.7248],'Fontvieille'],['france',[7.4392,43.749],'Larvotto'],['spain',[-5.382,35.9125],'Benzú'],['spain',[-5.3431,35.8709],'Tarajal'],['spain',[-2.952,35.3201],'Melilla north'],['spain',[-2.9294,35.2719],'Melilla south'],['spain',[-5.345,36.1532],'Gibraltar'],['united-kingdom',[-7.26,55.065],'Lough Foyle']])assert(near(lines[country],p,150),country+' frontier reaches '+place);
// Subdivision flags, at most two levels below the national flag, official flags only.
{
 const {europeFlags}=await import('../dist/europe-flags.mjs');
 const manifest=JSON.parse(fs.readFileSync('dist/data/europe/subdivision-flag-sources.json','utf8'));
 const expected={france:[23,71],spain:[19,37],italy:[20,31],'united-kingdom':[25,5]};
 for(const [country,[first,detail]] of Object.entries(expected)){
  const records=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/'+country+'/catalogue.bin'))).records,index=new Map(records.map(r=>[r.id,r]));
  const flags=europeFlags[country];
  assert.equal(Object.keys(flags.firstFlags).length,first,country+' first-level flags');assert.equal(Object.keys(flags.detailFlags).length,detail,country+' second-level flags');
  for(const [level,set] of [[1,flags.firstFlags],[2,flags.detailFlags]])for(const [id,flag] of Object.entries(set)){
   assert.equal(index.get(id)?.level,level,id+' is a level-'+level+' unit');
   for(const file of [flag.file,flag.full])assert(fs.existsSync('dist/'+file),id+' file '+file);
   assert(flag.license&&flag.credit&&flag.page.startsWith('https://commons.wikimedia.org/'),id+' source and license');
   assert(manifest.flags[id]?.sha256&&manifest.flags[id].status,id+' recorded with its status');
  }
  // Municipal flags are not included; a single-province community's flag is shown once.
  for(const [id] of Object.entries(flags.detailFlags))assert(records.filter(r=>r.parent===index.get(id).parent&&r.level===2).length>1,id+' is not the only province of its community');
 }
 for(const id of ['ES-P-03','ES-P-12','ES-P-15','ES-P-17','ES-P-25','ES-P-46'])assert(!europeFlags.spain.detailFlags[id],id+' has no official flag');
 assert(!europeFlags.france.detailFlags['FR-D-73'],'Savoie has no departmental council flag');
 // Italy: Milan's pictured flag is the de facto one; Udine's province is now a statistical unit;
 // Bergamo's and Terni's images are not on Commons. The UK: no official Northern Ireland flag.
 for(const id of ['IT-P-215','IT-P-30','IT-P-16','IT-P-55'])assert(!europeFlags.italy.detailFlags[id],id+' has no verified official flag');
 assert(!europeFlags['united-kingdom'].firstFlags['GB-R-TLN'],'Northern Ireland has no official flag');
 assert.equal(europeFlags['united-kingdom'].firstFlags['GB-R-TLJ'].name,'England','English regions show the flag of England');
}
// Iceland: Statistics Iceland's 2026 register and its localities; Turkey: TÜİK's 2022 register and
// a city dot for every province centre.
{const stats=JSON.parse(fs.readFileSync(root+'/iceland/statistics.json')).regions,regions=Object.entries(stats).filter(([,r])=>r.level===1);
 assert(regions.reduce((t,[,r])=>t+r.population.value,0)>385000,'Iceland 1 January 2026 total');
 const places=JSON.parse(fs.readFileSync(root+'/iceland/settlements.json')).records;assert(places.length>100&&places.some(p=>p.en==='Greater Reykjavík'&&p.population.value>240000),'Iceland localities');
 const tr=JSON.parse(fs.readFileSync(root+'/turkey/statistics.json')).regions;assert.equal(Object.values(tr).filter(r=>r.level===1).reduce((t,r)=>t+r.population.value,0),85279553,'Turkey 31 December 2022 total');
 const towns=JSON.parse(fs.readFileSync(root+'/turkey/settlements.json')).records;assert(towns.length>=80&&towns.every(t=>t.kind.startsWith('City')),'Turkish cities: the province centres only');}
// India: its own claims on its map; China's outline everywhere else; the 2011 census.
assert.equal(Object.values(JSON.parse(fs.readFileSync(root+'/india/statistics.json')).regions).reduce((t,r)=>t+r.population.value,0),1210854977,'India 2011 census total');
{const states=read('india','first.bin').regions.features,context=read('india','context.bin').features,home=context[0].geometry,claims=context.slice(1);
 const inState=(id,p)=>contains(states.find(f=>f.properties.id===id).geometry,p);
 for(const [id,p,place] of [['IN-AR',[91.86,27.59],'Tawang'],['IN-LA',[79.5,35.2],'Aksai Chin'],['IN-LA',[74.3,35.9],'Gilgit'],['IN-JK',[73.47,34.37],'Muzaffarabad'],['IN-SK',[88.61,27.33],'Gangtok']])assert(inState(id,p),place+' is in '+id+' on India’s map');
 for(const [p,place] of [[[91.86,27.59],'Tawang'],[[79.5,35.2],'Aksai Chin']])assert(!contains(home,p)&&claims.some(f=>contains(f.geometry,p)),place+' is a claim China holds, apart from India’s portal');
 assert(!contains(home,[74.3,35.9])&&!claims.some(f=>contains(f.geometry,[74.3,35.9])),'Pakistan-administered Kashmir is outside India’s portal');
 assert(contains(home,[88.61,27.33])&&contains(home,[77.2,28.6]),'India’s portal holds Sikkim and Delhi');
 assert.deepEqual(read('india','neighbours.bin').features.map(f=>f.properties.country).sort(),['afghanistan','bangladesh','bhutan','myanmar','nepal','pakistan']);
 for(const [p,place] of [[[85.32,27.7],'Kathmandu'],[[89.64,27.47],'Thimphu'],[[90.4,23.8],'Dhaka']])assert(read('india','neighbours.bin').features.some(f=>contains(f.geometry,p)),place+' is drawn beneath India');
 // The former Indian enclaves in Bangladesh, exchanged in 2015, are gone.
 assert(!polygons(states.find(f=>f.properties.id==='IN-WB').geometry).some(p=>p[0].every(q=>q[0]>88.5&&q[0]<89.9&&q[1]>25.8&&q[1]<26.6)),'West Bengal keeps no enclaves in Bangladesh');
 const lines=read('india','international.bin').features;assert(lines.some(f=>f.properties.claimedBy==='china')&&lines.some(f=>!f.properties.claimedBy),'India’s claim lines inside China are tagged');}
console.log('Europe (seven countries): outlines and subdivision hierarchies, chunked levels, statistics for every unit, enclaves and microstates, shared France seams drawn once, land frontiers without coastline.');
