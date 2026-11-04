// Builds dist/data/europe/united-states/history/borders.bin: the state and territory boundaries
// in force on any date from 1783 to 2000, for the Elections view's "Historic borders" and the
// United States historical snapshot. Source: the Newberry Library's U.S. Historical States and
// Territories shapefile (scripts/boundary-sources/united-states/historic-states/), every
// configuration from 3 September 1783 to 31 December 2000, dated to the day.
//
// All 220 dated polygons are simplified together (shared lines stay shared) and cut into one
// flat mosaic of faces, each listing the polygons that cover it. A date then needs no geometry
// of its own: it assigns every face to the unit covering it that day, and the unit borders are
// the mosaic edges whose two sides differ. Faces claimed by two units at once are the source's
// recorded boundary disputes and become a disputed unit of their own. Land of the present-day
// country not yet acquired is assigned to the country that held it (FOREIGN below), so it reads
// as part of Spain, France, Mexico, Russia, Britain or Hawaii rather than as blank land.
// Configurations are stored once and shared by every date that has them.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {gunzipSync,gzipSync} from 'node:zlib';
import {decodeData,encodeGeo} from '../dist/geo-pack.mjs';

const require=createRequire(import.meta.url),mapshaper=require('mapshaper'),topojson=require('topojson-client'),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
const root=new URL('../',import.meta.url),sources=new URL('scripts/boundary-sources/united-states/historic-states/',root),country=new URL('dist/data/europe/united-states/',root),out=new URL('history/',country);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',sources),'utf8')),bytes=readFileSync(new URL(manifest.file,sources));
assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256,'The retained archive matches its manifest');

// Simplification interval in metres; one value for every polygon keeps shared lines identical.
const INTERVAL=30,FIRST=17830903,LAST=20001231;
const zip=unzipSync(bytes),input=Object.fromEntries(manifest.members.map(path=>[path.split('/').at(-1),Buffer.from(zip[path])]));
const commands='-i US_HistStateTerr.shp name=versions -simplify interval='+INTERVAL+' keep-shapes -points inner + name=labels -mosaic target=versions + name=faces calc="ids=collect(ID_NUM)" -points inner target=faces + name=facepoints -o target=versions,faces,labels,facepoints format=topojson no-quantization out.json';
const topology=JSON.parse((await mapshaper.applyCommands(commands,input))['out.json']);
const objects=Object.fromEntries(Object.entries(topology.objects).map(([name,object])=>[name,topojson.feature(topology,object).features]));

const R=6371.0088,rad=Math.PI/180;
const ringArea=r=>{let a=0;for(let i=0;i<r.length-1;i++){const [x1,y1]=r[i],[x2,y2]=r[i+1];a+=(x2-x1)*rad*(2+Math.sin(y1*rad)+Math.sin(y2*rad));}return Math.abs(a*R*R/2);};
const polygons=g=>!g?[]:g.type==='Polygon'?[g.coordinates]:g.coordinates;
const area=g=>polygons(g).reduce((s,p)=>s+ringArea(p[0])-p.slice(1).reduce((t,h)=>t+ringArea(h),0),0);
const bounds=geometries=>{let w=180,s=90,e=-180,n=-90;for(const g of geometries)for(const p of polygons(g))for(const [x,y] of p[0]){w=Math.min(w,x);e=Math.max(e,x);s=Math.min(s,y);n=Math.max(n,y);}return [[w,s],[e,n]].map(c=>c.map(v=>+v.toFixed(4)));};
const point=f=>f.geometry.coordinates.map(v=>+v.toFixed(4));
const iso=n=>String(n).replace(/(\d{4})(\d\d)(\d\d)/,'$1-$2-$3');

// Display names: the source abbreviates some to fit its 20-character field.
const NAMES={tx_republic:'Republic of Texas',ub_area:'Uncertain boundary area',er_triangleuft:'Erie Triangle',wi_terrdefacto:'Wisconsin Territory (de facto)',fl_uft:'Florida (unorganized)',or_uft:'Oregon (unorganized)',uf_terr:'Unorganized federal territory'};
// Mapped areas that were not under the United States alone: independent republics, and land
// claimed jointly with Britain.
const SOVEREIGN={tx_republic:'Texas',vt_republic:'Vermont',or_country:'Contested',ub_area:'Contested'};
const versions=objects.versions.filter(f=>f.geometry).map(f=>{const p=f.properties;return {id:+p.ID_NUM,key:p.ID,name:NAMES[p.ID]||p.FULL_NAME,type:p.TERR_TYPE,start:+p.START_N,end:+p.END_N,change:p.CHANGE,citation:p.CITATION,label:point(objects.labels.find(l=>l.properties.ID_NUM===p.ID_NUM)),bounds:bounds([f.geometry])};});
const byId=new Map(versions.map(v=>[v.id,v]));
assert.equal(versions.length,220,'Every dated polygon of the source');

// Deseret, the Mormon provisional state of 1849–1851 that Congress never recognised, overlaps
// the official Mexican Cession and territories; the official jurisdictions are drawn.
const UNOFFICIAL=new Set(['ds_deseret']);
const faces=objects.faces.map((f,i)=>{const covering=(f.properties.ids||[]).filter(id=>byId.has(id)&&!UNOFFICIAL.has(byId.get(id).key));return {index:i,versions:covering,area:area(f.geometry),geometry:f.geometry,label:point(objects.facepoints[i]),first:covering.map(id=>byId.get(id)).sort((a,b)=>a.start-b.start)[0]};});
// Mosaic edges: each arc of the topology with the faces on either side (-1 outside every face).
const sides=new Map(),walk=(value,face)=>Array.isArray(value)?value.forEach(v=>walk(v,face)):sides.set(value<0?~value:value,[...(sides.get(value<0?~value:value)||[]),face]);
topology.objects.faces.geometries.forEach((g,i)=>walk(g.arcs,i));
const arcs=[...sides].map(([arc,[l,r=-1]])=>({arc,l,r,geometry:topojson.feature(topology,{type:'LineString',arcs:[arc]}).geometry}));
assert(arcs.every(a=>sides.get(a.arc).length<=2),'Every edge separates at most two faces');

// Land borders: the runs of outer mosaic edges that follow today's borders with Canada and
// Mexico (the atlas's own international lines, within 3 km), so a date can draw the frontier
// its units actually had there. Coastlines stay with the base map.
const international=(await decodeData(readFileSync(new URL('international.bin',country)))).features;
const CELL=.2,grid=new Map(),cellKey=(x,y)=>Math.floor(x/CELL)+','+Math.floor(y/CELL);
for(const f of international){const pair=f.properties.pair==='MEX-USA'?'MX':'CA';for(const line of f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];for(let x=Math.floor(Math.min(a[0],b[0])/CELL)-1;x<=Math.floor(Math.max(a[0],b[0])/CELL)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/CELL)-1;y<=Math.floor(Math.max(a[1],b[1])/CELL)+1;y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push([a,b,pair]);}}}
function nearBorder([x,y]){
 const kx=Math.cos(y*rad)*111.32;let best=Infinity,pair=null;
 for(const [a,b,p] of grid.get(cellKey(x,y))||[]){const ax=(a[0]-x)*kx,ay=(a[1]-y)*110.57,bx=(b[0]-x)*kx,by=(b[1]-y)*110.57,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(ax+t*dx,ay+t*dy);if(d<best){best=d;pair=p;}}
 return best<=3?pair:null;
}
const borders=[];
for(const a of arcs.filter(a=>a.r<0)){let run=[],pair=null;const flush=()=>{if(run.length>1)borders.push({id:borders.length,face:a.l,pair,coordinates:run});run=[];};for(const c of a.geometry.coordinates){const p=nearBorder(c);if(p&&(p===pair||!run.length)){run.push(c);pair=p;}else{flush();if(p){run=[c];pair=p;}}}flush();}

// Who held land of the present-day country before the United States did, by the polygon that
// first brought it in. Each period runs until (and including) its date.
const NEW_SPAIN={until:18210927,period:'spain',name:'New Spain',sovereign:'Spain',note:'Part of New Spain, the Spanish viceroyalty in North America, until Mexican independence in 1821.'};
const MEXICO='Part of Mexico, independent from Spain since 1821. Texas broke away in 1836; Mexico ceded the Southwest to the United States in 1848 and sold the Gadsden Purchase in 1853.';
// One holder's land under one name is one unit, whichever later acquisitions it came from.
const FOREIGN={
 la_purchase:[{until:18000930,period:'spain',name:'Spanish Louisiana',sovereign:'Spain',note:'Louisiana, a Spanish colony since 1762. Spain returned it to France in 1800.'},{until:18030429,period:'france',name:'French Louisiana',sovereign:'France',note:'Louisiana, returned to France by Spain in 1800, though Spain still governed it. France sold it to the United States in 1803.'}],
 fl_uft:[{until:LAST,period:'spain',name:'Spanish Florida',sovereign:'Spain',note:'Spanish Florida, which Spain ceded to the United States in 1819.'}],
 // West Florida, which the source places in Orleans Territory from 1804, when the United States
 // first claimed it.
 ol_terr:[{until:LAST,period:'spain',name:'Spanish West Florida',sovereign:'Spain',note:'West Florida, held by Spain. The United States claimed it from 1804 and took it in 1810–1813.'}],
 mo_terr:[{...NEW_SPAIN,until:LAST}],
 tx_republic:[NEW_SPAIN,{until:LAST,period:'mexico',name:'Mexico',sovereign:'Mexico',note:MEXICO}],
 mx_cession:[NEW_SPAIN,{until:LAST,period:'mexico',name:'Mexico',sovereign:'Mexico',note:MEXICO}],
 gd_purchase:[NEW_SPAIN,{until:LAST,period:'mexico',name:'Mexico',sovereign:'Mexico',note:MEXICO}],
 or_country:[{until:LAST,period:'claimed',name:'Oregon Country',sovereign:'Contested',note:'Claimed by Spain and Britain.'}],
 ub_area:[{until:LAST,period:'britain',name:'Rupert\'s Land',sovereign:'Britain',note:'Part of Rupert\'s Land, the Hudson\'s Bay Company\'s territory in British North America.'}],
 ak_dept:[{until:LAST,period:'russia',name:'Russian America',sovereign:'Russia',note:'Part of the Russian Empire until the United States bought it in 1867.'}],
 hi_annexation:[{until:17950430,period:'chiefdoms',name:'Hawaiian Islands',sovereign:'Hawaii',note:'Independent chiefdoms, before Kamehameha I\'s conquests of 1795 united most of the islands.'},{until:18930116,period:'kingdom',name:'Kingdom of Hawaii',sovereign:'Hawaii',note:'An independent kingdom until its monarchy was overthrown in 1893.'},{until:18940703,period:'provisional',name:'Provisional Government of Hawaii',sovereign:'Hawaii',note:'Governed by the provisional government that overthrew the monarchy in 1893.'},{until:LAST,period:'republic',name:'Republic of Hawaii',sovereign:'Hawaii',note:'An independent republic until the United States annexed it in 1898.'}]
};
// Land outside the country on a day is held by whoever held it before the next polygon to cover
// it: the polygon that first brought it in, or that brought it back after a cession (the
// Adams–Onís Treaty of 1819 gave Spain land the United States had claimed). Land never covered
// again, such as Oregon Country north of the 49th parallel, lies outside the present-day country.
const nextCovering=(face,day)=>face.versions.map(id=>byId.get(id)).filter(v=>v.start>day).sort((a,b)=>a.start-b.start)[0];
const unknown=new Set();
const foreignKey=held=>'foreign:'+held.name.toLowerCase().replace(/[^a-z]+/g,'-');
// Slivers under a square kilometre from later boundary adjustments may stay unassigned.
const foreignAt=(face,day)=>{const next=nextCovering(face,day);if(next&&!FOREIGN[next.key]&&face.area>=1)unknown.add(next.key+' '+iso(next.start)+' '+Math.round(face.area)+' km²');const period=next&&FOREIGN[next.key]?.find(p=>day<=p.until);return period&&{region:next.key,...period};};

// Election days: the last day of each election's voting, read from the results data.
const presidential=JSON.parse(gunzipSync(readFileSync(new URL('elections/presidential.bin',country))));
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const electionDay=e=>{const m=[...e.date.matchAll(/([A-Z][a-z]+) (\d+)(?:, (\d{4}))?/g)].at(-1),year=+(m[3]||e.date.match(/\d{4}/g).at(-1));return year*10000+(MONTHS.indexOf(m[1])+1)*100+ +m[2];};

// Modern states from the source's final configuration, for "part of" lookups.
const modernKey=v=>v.type==='State'||v.type==='District of Columbia'?'US-'+v.key.slice(0,2).toUpperCase():null;
const finalVersions=versions.filter(v=>v.end>=LAST);
const configs=[],signatures=new Map();
// The configuration on a day. pending: states drawn with their admission boundary before it
// took effect (states that voted before their admission).
function configFor(day,pending=[]){
 const active=versions.filter(v=>v.start<=day&&day<=v.end).map(v=>v.id).sort((a,b)=>a-b);
 const foreign=faces.map(f=>f.versions.some(id=>active.includes(id)||pending.includes(id))?null:foreignAt(f,day));
 const signature=active.join(',')+'|'+pending.join(',')+'|'+[...new Set(foreign.filter(Boolean).map(foreignKey))].sort().join(',');
 if(signatures.has(signature))return signatures.get(signature);
 const units=[],unitOf=new Map(),face=faces.map(f=>{
  const covering=(f.versions.some(id=>pending.includes(id))?f.versions.filter(id=>pending.includes(id)):f.versions.filter(id=>active.includes(id))).sort((a,b)=>a-b),held=foreign[f.index];
  const key=covering.length?covering.join('+'):held?foreignKey(held):null;if(!key)return -1;
  if(!unitOf.has(key)){unitOf.set(key,units.length);units.push({versions:covering,held,faces:[]});}
  const unit=unitOf.get(key);units[unit].faces.push(f.index);return unit;
 });
 for(const unit of units){
  const members=unit.versions.map(id=>byId.get(id)),largest=unit.faces.reduce((a,b)=>faces[a].area>=faces[b].area?a:b),own={label:faces[largest].label,bounds:bounds(unit.faces.map(i=>faces[i].geometry))};
  if(unit.held)Object.assign(unit,{key:foreignKey(unit.held),name:unit.held.name,type:'Foreign',sovereign:unit.held.sovereign,note:unit.held.note,...own});
  else if(members.length===1){const [v]=members;Object.assign(unit,{key:v.key,name:v.name,type:v.type,sovereign:SOVEREIGN[v.key]||'US',version:v.id,state:modernKey(v),label:v.label,bounds:v.bounds});}
  else Object.assign(unit,{key:'disputed:'+members.map(v=>v.key).join('+'),name:'Disputed: '+members.map(v=>v.name).join(' and '),type:'Disputed',sovereign:'US',claimants:members.map(v=>v.name),...own});
  delete unit.held;
 }
 // Borders between units of one country, and frontiers between countries: the mosaic edges
 // whose sides differ, and the land borders where a unit meets Canada or Mexico under another
 // holder (an area's present-day border with Mexico is no border while Mexico or Spain held
 // it). Contested areas have no settled frontier.
 const lines=[],frontiers=[];
 for(const a of arcs)if(a.r>=0&&face[a.l]!==face[a.r]){const l=face[a.l],r=face[a.r];if(l<0||r<0)continue;(units[l].sovereign===units[r].sovereign?lines:frontiers).push(a.arc);}
 const neighbour=pair=>pair==='CA'?'Britain':day<=NEW_SPAIN.until?'Spain':'Mexico';
 const outer=borders.filter(b=>{const unit=units[face[b.face]];return unit&&unit.sovereign!=='Contested'&&unit.sovereign!==neighbour(b.pair);}).map(b=>b.id);
 // The unit holding most of each present-day state's area.
 const partOf={};for(const v of finalVersions){const id=modernKey(v);if(!id)continue;const shares=new Map();for(const f of faces)if(f.versions.includes(v.id)&&face[f.index]>=0)shares.set(face[f.index],(shares.get(face[f.index])||0)+f.area);const best=[...shares].sort((a,b)=>b[1]-a[1])[0];if(best)partOf[id]=best[0];}
 configs.push({versions:active,...(pending.length?{pending}:{}),units:units.map(({faces:_,...u})=>u),face,lines,frontiers,borders:outer,partOf});
 signatures.set(signature,configs.length-1);return configs.length-1;
}

const elections={};
for(const e of presidential.elections){
 const day=Math.min(electionDay(e),LAST),active=versions.filter(v=>v.start<=day&&day<=v.end);
 // A state that voted before its admission (Missouri in 1820, Michigan in 1836) is drawn with
 // the boundary it was admitted with, cut out of the territory that still held the rest.
 const pending=[...Object.keys(e.states),...(e.notVoting||[])].filter(state=>!active.some(v=>modernKey(v)===state)).map(state=>{const v=versions.filter(v=>modernKey(v)===state&&v.start>day).sort((a,b)=>a.start-b.start)[0];assert(v,e.year+' '+state+': a result without a polygon');return v.id;});
 // Elections after the source's last date use its final configuration.
 elections[e.year]={config:configFor(day,pending),date:iso(electionDay(e)),...(day<electionDay(e)?{boundaries:iso(day)}:{})};
}
// The historical snapshot: the configuration at the end of every year.
const years={};
for(let year=1783;year<=2000;year++)years[year]={config:configFor(year*10000+1231),date:iso(year*10000+1231)};

assert.deepEqual([...unknown],[],'Every area outside the country has a holder');
const precision=v=>Array.isArray(v)?v.map(precision):typeof v==='number'?+v.toFixed(6):v;
const data={
 source:{title:manifest.title,publisher:manifest.publisher,url:manifest.page,license:'CC0 1.0',sha256:manifest.sha256,simplification:INTERVAL+' m',lastDate:iso(LAST)},
 versions:versions.map(v=>({...v,start:iso(v.start),end:iso(v.end)})),
 faces:{type:'FeatureCollection',features:faces.map(f=>({type:'Feature',properties:{f:f.index},geometry:{type:f.geometry.type,coordinates:precision(f.geometry.coordinates)}}))},
 arcs:{type:'FeatureCollection',features:arcs.map(a=>({type:'Feature',properties:{a:a.arc,l:a.l,r:a.r},geometry:{type:a.geometry.type,coordinates:precision(a.geometry.coordinates)}}))},
 borders:{type:'FeatureCollection',features:borders.map(b=>({type:'Feature',properties:{b:b.id},geometry:{type:'LineString',coordinates:precision(b.coordinates)}}))},
 configs,elections,years
};
mkdirSync(out,{recursive:true});
writeFileSync(new URL('borders.bin',out),gzipSync(encodeGeo(data,{source:manifest.sha256},{scale:1e6}),{level:9}));
console.log('US historic borders: '+versions.length+' dated polygons, '+faces.length+' faces, '+arcs.length+' edges, '+borders.length+' land-border runs; '+configs.length+' configurations for '+Object.keys(elections).length+' elections and '+Object.keys(years).length+' years.');
