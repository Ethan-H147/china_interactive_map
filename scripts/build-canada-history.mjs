import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {input,read,write,modern,featureOf,clean} from './canada-map-geometry.mjs';
const require=createRequire(import.meta.url),{topology}=require('topojson-server'),{feature}=require('topojson-client'),mapshaper=require('mapshaper');
const source='https://open.canada.ca/data/dataset/e88ce995-b69a-4595-a752-bb06b061b5a3';
const history='https://www.canada.ca/en/canadian-heritage/services/historical-boundaries-canada.html';

const entries={
 1867:['07-01','Ontario, Quebec, New Brunswick and Nova Scotia form Canada.'],
 1870:['07-15','Rupert’s Land and the North-Western Territory are transferred to Canada. Manitoba is established in the Red River region.'],
 1871:['07-20','British Columbia joins Confederation.'],
 1873:['07-01','Prince Edward Island joins Confederation.'],
 1874:['07-26','Ontario’s provisional northern and western limits are shown.'],
 1876:['04-12','The District of Keewatin is established.'],
 1880:['09-01','Britain transfers its remaining Arctic claims to Canada.'],
 1881:['07-01','Manitoba expands. Part of the new area is also claimed by Ontario.'],
 1882:['05-08','The districts of Assiniboia, Saskatchewan, Alberta and Athabaska are established.'],
 1886:['05-07','The Atlas shows the revised Ontario boundary and the area still contested by Manitoba.'],
 1889:['08-12','The Ontario boundary is confirmed by statute.'],
 1895:['10-02','Ungava, Franklin, Mackenzie and Yukon become districts in the Northwest Territories.'],
 1897:['12-31','The Atlas shows revised northern districts.'],
 1898:['06-13','Yukon becomes a separate territory. Quebec expands north.'],
 1901:['12-31','The Atlas records further changes to the northern districts.'],
 1905:['09-01','Alberta and Saskatchewan become provinces. Keewatin returns to the Northwest Territories.'],
 1912:['05-15','Manitoba, Ontario and Quebec extend north.'],
 1920:['12-31','The boundaries of the northern districts are reorganized.'],
 1927:['03-01','The Judicial Committee of the Privy Council defines the Quebec–Labrador boundary.'],
 1949:['03-31','Newfoundland joins Confederation.'],
 1999:['04-01','Nunavut becomes a territory separate from the Northwest Territories.'],
 2001:['12-06','Newfoundland is renamed Newfoundland and Labrador.'],
 2003:['04-01','Yukon Territory becomes officially known as Yukon.']
};
const keys={Ontario:'ON',Quebec:'QB',Manitoba:'MB','British Columbia':'BC','New Brunswick':'NB','Nova Scotia':'NS','Prince Edward Island':'PE',Alberta:'AB',Saskatchewan:'SK',Newfoundland:'NL','Newfoundland and Labrador':'NL',Nunavut:'NU',Yukon:'YT','Yukon Territory':'YT','District of Yukon':'YT','Yukon District':'YT','Northwest Territories':'NT','District of Keewatin':'keewatin','District of Mackenzie':'mackenzie','District of Franklin':'franklin','District of Ungava':'ungava','District of Assiniboia':'assiniboia','District of Saskatchewan':'district-saskatchewan','District of Alberta':'district-alberta','District of Athabaska':'athabaska','North-Western Territory':'north-western',"Rupert's Land":'ruperts-land','Arctic Islands':'arctic','Disputed area':'ontario-manitoba-dispute'};
const info={
 PC:'Canada East and Canada West were sections of one colony. They became Quebec and Ontario at Confederation.',
 BC:'The mainland colony and Vancouver Island united in November 1866. British Columbia joined Confederation in 1871.',
 PE:'Prince Edward Island joined Confederation in 1873.',
 NL:'Newfoundland joined Confederation in 1949 and was renamed Newfoundland and Labrador in 2001. Its inland Labrador boundary before the 1927 decision is generalized.',
 'ruperts-land':'The Hudson’s Bay Company claimed the Hudson Bay drainage basin under its royal charter. The claim did not extinguish Indigenous sovereignty or title. The area was transferred to Canada in 1870.',
 'north-western':'The territory lay beyond Rupert’s Land and was transferred to Canada in 1870.',
 arctic:'Britain transferred its remaining claims in the Arctic Archipelago to Canada in 1880. This does not depict Inuit homelands.',
 'ontario-manitoba-dispute':'Ontario and Manitoba both claimed this area. The source depicts the dispute separately.',
 keewatin:'Keewatin began as a separate territorial district in 1876 and returned to the Northwest Territories in 1905. It remained a district of the Northwest Territories afterward.',
 assiniboia:'A district of the Northwest Territories from 1882 until the creation of Alberta and Saskatchewan in 1905.',
 'district-alberta':'A district of the Northwest Territories established in 1882. The province formed in 1905 had different boundaries.',
 'district-saskatchewan':'A district of the Northwest Territories established in 1882. The province formed in 1905 had different boundaries.'
};
const yearKeys=Object.keys(entries).map(Number),events={},versions={},snapshots=[];
const firstYear=1866,firstDate='1866-12-31';
const asOf=process.env.CANADA_HISTORY_AS_OF||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const base=fc(modern.features.map(f=>({...f,properties:{modern:f.properties.id.slice(3)}})));
const mainProvinces=new Set(base.features.map(f=>f.properties.modern));
const catalogue=(y,raw)=>raw.features.flatMap(f=>{
 const name=f.properties.PROV_NAME,colonial=f.properties.Period_Group.includes('British Colony');
 let id=keys[name];assert(id,name);
 let type=colonial?'Colony':mainProvinces.has(id)?'Province':'Territorial district',display=name;
 if(y===1866&&['ON','QB'].includes(id)){id='PC';display='Province of Canada';type='Colony';}
 if(y===1866&&['NB','NS'].includes(id))type='Colony';
 if(id==='NL'&&y>=1927&&y<1949)type='Dominion';
 if(['ruperts-land','north-western','arctic'].includes(id))type=id==='ruperts-land'?'Company lands':'British claims';
 if(id==='ontario-manitoba-dispute'){type='Disputed';display='Ontario–Manitoba dispute';}
 if(['NT','NU'].includes(id)||id==='YT'&&y>=1898)type='Territory';
 if(id==='YT'&&y<1898)type='Territorial district';
 if(id==='YT'&&y>=1898&&y<2003)display='Yukon Territory';
 if(id==='arctic')display='Arctic islands';
 return [{feature:featureOf(id,f.geometry),id,name:display,type,note:info[id]||(type==='Territorial district'?'A historical district of the Northwest Territories.':'')}];
});
for(const year of [firstYear,...yearKeys]){
 const date=year===firstYear?firstDate:year+'-'+entries[year][0],data=read(input+'territory-'+Math.max(1867,year)+'.json');
 assert(data.features.length>3);
 const defs=new Map(),dated=catalogue(year,data);
 if(year<=1867)dated.push({id:'arctic',name:'Arctic islands',type:'British claims',note:info.arctic});
 for(const {id,name,type,note} of dated){
  const since=versions[id]?.since||date;
  const unit={key:id,name,type,note,since};
  defs.set(id,unit);versions[id]=unit;
 }
 let display;
 if(year>=2003)display=fc(modern.features.map(f=>featureOf(f.properties.id.slice(3),f.geometry)));
 else{
  // Intersect the dated political source with today's land, then assign only
  // the shoreline pieces not covered by the source. The output never adds
  // land outside the current mask or leaves it showing through in gray.
  const hist=fc(dated.filter(x=>x.feature).map(({feature,id})=>({...feature,properties:{dated:id}})));
  const flat=clean(await command({'modern.json':base,'dated.json':hist},'-i dated.json -union target=* -filter "!!modern" -explode',{precision:.000001}));
  const topologyOf=topology({flat}),shared=new Map(),anchors=new Map(),all=[];
  for(const [i,g] of topologyOf.objects.flat.geometries.entries()){
   const f=flat.features[i],{dated:id,modern}=f.properties;if(!id)continue;
   for(const a of g.arcs.flat(Infinity))shared.set(a<0?~a:a,id);
   if(geographicAreaKm2(f.geometry)<.1)continue;
   const ring=f.geometry.coordinates[0],w=Math.min(...ring.map(p=>p[0])),e=Math.max(...ring.map(p=>p[0])),s=Math.min(...ring.map(p=>p[1])),n=Math.max(...ring.map(p=>p[1]));
   const a={id,w,e,s,n};if(!anchors.has(modern))anchors.set(modern,[]);anchors.get(modern).push(a);all.push(a);
  }
  for(const [i,g] of topologyOf.objects.flat.geometries.entries()){
   const f=flat.features[i],{dated,modern}=f.properties;let id=dated;
   if(!id){
    const votes=new Map();
    for(const a of g.arcs.flat(Infinity).map(a=>a<0?~a:a)){
     const owner=shared.get(a);if(!owner)continue;
     const pts=topologyOf.arcs[a];let length=0;
     for(let j=1;j<pts.length;j++)length+=Math.hypot((pts[j][0]-pts[j-1][0])*Math.cos(pts[j][1]*Math.PI/180),pts[j][1]-pts[j-1][1]);
     votes.set(owner,(votes.get(owner)||0)+length);
    }
    const p=f.geometry.coordinates[0][0];
    if(year<1880&&modern==='NU'&&p[1]>67&&!votes.size)id='arctic';
    else if(votes.size)id=[...votes].sort((a,b)=>b[1]-a[1])[0][0];
    else if(['BC','PE','NL','NS','NB'].includes(modern))id=modern;
    else{
     let best=Infinity;
     for(const a of anchors.get(modern)||all){
      const dx=Math.max(a.w-p[0],p[0]-a.e,0)*Math.cos(p[1]*Math.PI/180),dy=Math.max(a.s-p[1],p[1]-a.n,0),d=Math.hypot(dx,dy)+Math.hypot((a.w+a.e)/2-p[0],(a.s+a.n)/2-p[1])*.002;
      if(d<best){best=d;id=a.id;}
     }
    }
    if(id==='arctic'&&!defs.has(id)){const unit={key:id,name:'Arctic islands',type:'British claims',note:info.arctic,since:firstDate};defs.set(id,unit);versions[id]=unit;}
   }
   assert(defs.has(id),'Unassigned Canadian land in '+year);f.properties={id};
  }
  display=await command(flat,'-dissolve2 id',{precision:.000001});
 }
 snapshots.push({year,date,display:clean(display),defs});
 events[year]=[{date,text:year===firstYear?'British North America shortly before Confederation. The mainland colony of British Columbia and Vancouver Island had united in November.':entries[year][1],...(date.endsWith('12-31')?{when:String(year)}:{})}];
 console.log(date,display.features.length,'divisions');
}
events[1903]=[{date:'1903-10-20',text:'The Alaska boundary tribunal settles the dispute. This atlas uses the current international land outline.'}];

// One dated mosaic, in the format of the United States history (scripts/build-us-historic-borders.mjs,
// dist/historic-borders.mjs): a division whose shape and description do not change keeps one
// version across years; every version is cut into shared faces, and a year only assigns faces
// to divisions. Selecting or changing year then needs no geometry of its own.
const dayBefore=date=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);};
const dated=[],open=new Map();
snapshots.forEach((s,i)=>{
 const end=i+1<snapshots.length?dayBefore(snapshots[i+1].date):asOf,seen=new Set();
 for(const f of s.display.features){
  const id=f.properties.id,unit=s.defs.get(id),signature=createHash('sha256').update(JSON.stringify([f.geometry,unit.name,unit.type,unit.note])).digest('hex'),previous=open.get(id);
  if(previous?.signature===signature)previous.version.end=end;
  else{const version={id:dated.length,key:id,name:unit.name,type:unit.type,note:unit.note,since:unit.since,start:s.date,end,geometry:f.geometry};dated.push(version);open.set(id,{signature,version});}
  seen.add(id);
 }
 for(const id of [...open.keys()])if(!seen.has(id))open.delete(id);
});
const layer=fc(dated.map(v=>({type:'Feature',properties:{vid:v.id},geometry:v.geometry})));
const mosaic=JSON.parse((await mapshaper.applyCommands('-i versions.json name=versions -points inner + name=labels -mosaic target=versions + name=faces calc="ids=collect(vid)" -o target=faces,labels format=topojson no-quantization out.json',{'versions.json':JSON.stringify(layer)}))['out.json']);
const faceFeatures=feature(mosaic,mosaic.objects.faces).features,labels=new Map(feature(mosaic,mosaic.objects.labels).features.map(f=>[f.properties.vid,f.geometry.coordinates.map(v=>+v.toFixed(4))]));
const faceVersions=faceFeatures.map(f=>f.properties.ids||[]);
const sides=new Map(),walk=(value,face)=>Array.isArray(value)?value.forEach(v=>walk(v,face)):sides.set(value<0?~value:value,[...(sides.get(value<0?~value:value)||[]),face]);
mosaic.objects.faces.geometries.forEach((g,i)=>walk(g.arcs,i));
const arcs=[...sides].map(([arc,[l,r=-1]])=>({arc,l,r,geometry:feature(mosaic,{type:'LineString',arcs:[arc]}).geometry}));
assert(arcs.every(a=>sides.get(a.arc).length<=2),'Every edge separates at most two faces');
const configs=[],signatures=new Map();
function configFor(date){
 const active=dated.filter(v=>v.start<=date&&date<=v.end).map(v=>v.id),signature=active.join(',');
 if(signatures.has(signature))return signatures.get(signature);
 const units=[],unitOf=new Map(),face=faceVersions.map(ids=>{
  // Slivers between versions digitized apart keep the lowest version covering them.
  const vid=ids.filter(id=>active.includes(id)).sort((a,b)=>a-b)[0];if(vid===undefined)return -1;
  if(!unitOf.has(vid)){const v=dated[vid];unitOf.set(vid,units.length);units.push({id:v.key,key:v.key,name:v.name,type:v.type,note:v.note,since:v.since,version:v.id,label:labels.get(v.id),bounds:geographicBounds(v.geometry)});}
  return unitOf.get(vid);
 });
 const lines=arcs.filter(a=>a.r>=0&&face[a.l]>=0&&face[a.r]>=0&&face[a.l]!==face[a.r]).map(a=>a.arc);
 configs.push({units,face,lines,frontiers:[],borders:[],partOf:{}});signatures.set(signature,configs.length-1);return configs.length-1;
}
const years={};
for(let year=firstYear;year<=+asOf.slice(0,4);year++){
 const date=year===+asOf.slice(0,4)?asOf:year+'-12-31';
 years[year]={date,config:configFor(date)};
}
const precision=v=>Array.isArray(v)?v.map(precision):typeof v==='number'?+v.toFixed(6):v;
write('history/borders.bin',{
 source:{name:'Natural Resources Canada / Atlas of Canada',url:source,history,asOf,lastDate:asOf},
 versions:dated.map(({geometry:_,...v})=>v),
 faces:fc(faceFeatures.map((f,i)=>({type:'Feature',properties:{f:i},geometry:{type:f.geometry.type,coordinates:precision(f.geometry.coordinates)}}))),
 arcs:fc(arcs.map(a=>({type:'Feature',properties:{a:a.arc,l:a.l,r:a.r},geometry:{type:a.geometry.type,coordinates:precision(a.geometry.coordinates)}}))),
 borders:fc([]),configs,years,events
},true);
console.log('Canada history: '+dated.length+' dated divisions, '+faceFeatures.length+' faces, '+arcs.length+' edges; '+configs.length+' configurations for '+Object.keys(years).length+' years.');
