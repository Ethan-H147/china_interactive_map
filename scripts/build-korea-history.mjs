// Korea's historical snapshots (Samhan, c. 100 CE; Joseon, 1890) as one dated mosaic in the
// format of the United States and Canada histories (dist/historic-borders.mjs), built by the
// shared historic-mosaic.mjs. Each historical unit is a set of whole present-day districts, so
// the snapshots share the present-day coast.
// Inputs are retained under scripts/boundary-sources/korea-history/; nothing is downloaded.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {area,centre,largestCover,nearestUnit,polygons,writeMosaic} from './historic-mosaic.mjs';
const require=createRequire(import.meta.url),clip=require('polygon-clipping');
const sources='scripts/boundary-sources/korea-history/',out='dist/data/korea/history/borders.bin';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const boundaries=JSON.parse(gunzipSync(fs.readFileSync('dist/data/korea-boundaries.bin')));
const cliopatria=read(sources+'cliopatria-100.geojson'),joseon=read(sources+'joseon-1890.json'),manifest=read(sources+'manifest.json');

// Present-day pieces: every district, Sejong (which has none), and Ongjin's islands one by one.
const pieces=[];
for(const f of boundaries.second.features){
 const p=f.properties;
 if(p.id===joseon.ongjin.id)polygons(f.geometry).forEach((polygon,i)=>pieces.push({id:p.id+'#'+i,district:p.id,province:p.parent,polygons:[polygon]}));
 else pieces.push({id:p.id,district:p.id,province:p.parent,polygons:polygons(f.geometry)});
}
const covered=new Set(boundaries.second.features.map(f=>f.properties.parent));
for(const f of boundaries.first.features)if(!covered.has(f.properties.id))pieces.push({id:f.properties.id,district:f.properties.id,province:f.properties.id,polygons:polygons(f.geometry)});
// Province land no district covers (about 19 km² of Kangwon) joins the nearest district.
const nearest=(list,[x,y])=>list.reduce((best,piece)=>{let d=Infinity;for(const polygon of piece.polygons)for(const [a,b] of polygon[0])d=Math.min(d,Math.hypot((a-x)*Math.cos(y*Math.PI/180),b-y));return d<best[1]?[piece,d]:best;},[null,Infinity])[0];
for(const f of boundaries.first.features){
 const own=pieces.filter(p=>p.province===f.properties.id);if(!own.length||own[0].district===f.properties.id)continue;
 for(const polygon of clip.difference(polygons(f.geometry),...own.map(p=>p.polygons))){
  if(area([polygon])<1e-4)continue;
  const at=polygon[0].reduce(([x,y],[a,b])=>[x+a/polygon[0].length,y+b/polygon[0].length],[0,0]),host=nearest(own,at);
  pieces.push({id:host.id+'+'+pieces.length,district:host.district,province:host.province,polygons:[polygon],host});
 }
}

// Samhan: the polity covering most of each piece in Cliopatria's 100 CE layer.
const samhanUnits={
 mahan:{name:'Mahan',ko:'마한',hanja:'馬韓',type:'Confederacy',note:'54 statelets. Baekje grew from one of them.'},
 jinhan:{name:'Jinhan',ko:'진한',hanja:'辰韓',type:'Confederacy',note:'12 statelets. Silla grew from one of them, Saro.'},
 byeonhan:{name:'Byeonhan',ko:'변한',hanja:'弁韓',type:'Confederacy',note:'12 statelets. The Gaya states grew from them.'},
 goguryeo:{name:'Goguryeo',ko:'고구려',hanja:'高句麗',type:'Kingdom',note:'Its capital, Gungnae, is now Ji’an in China.'},
 okjeo:{name:'Okjeo',ko:'옥저',hanja:'沃沮',type:'Chiefdoms',note:'Paid tribute to Goguryeo.'},
 dongye:{name:'Dongye',ko:'동예',hanja:'東濊',type:'Chiefdoms'},
 lelang:{name:'Lelang',ko:'낙랑군',hanja:'樂浪郡',type:'Han commandery',note:'A commandery of Han China, 108 BCE to 313 CE.'},
 juho:{name:'Juho',ko:'주호',hanja:'州胡',type:'Chiefdoms',note:'Recorded on a large island off Mahan; usually identified with Jeju.'}
};
const polity={Mahan:'mahan',Jinhan:'jinhan',Byeonhan:'byeonhan',Goguryeo:'goguryeo','Dong-okjeo':'okjeo',Dongye:'dongye','Han Dynasty':'lelang'};
const reference=cliopatria.features.map(f=>({unit:polity[f.properties.Name],polygons:polygons(f.geometry)}));
assert.equal(new Set(reference.map(r=>r.unit)).size,7,'Seven Cliopatria polities in 100 CE');
const samhanOverride={'KR-50110':'juho','KR-50130':'juho','KR-47940':null};
const own=pieces.filter(p=>!p.host);
largestCover(own.filter(p=>!(p.district in samhanOverride)),reference,{field:'samhan'});
for(const piece of own)if(piece.district in samhanOverride)piece.samhan=samhanOverride[piece.district];
// Islands outside every Cliopatria polygon take the polity of the nearest assigned piece.
nearestUnit(own,'samhan');
for(const piece of pieces)if(piece.host)piece.samhan=piece.host.samhan;

// Joseon: the province of each present-day district, from the compiled table.
const exceptions=new Map(joseon.exceptions.flatMap(e=>e.ids.map(id=>[id,e.province])));
for(const piece of pieces){
 if(piece.district===joseon.ongjin.id)piece.joseon=centre(piece)[1]>joseon.ongjin.northOf?joseon.ongjin.north:joseon.ongjin.south;
 else piece.joseon=exceptions.get(piece.district)||joseon.byProvince[piece.province];
 assert(joseon.provinces[piece.joseon],'Joseon province for '+piece.id);
}
for(const id of exceptions.keys())assert(pieces.some(p=>p.district===id),'Exception district '+id+' exists');
const joseonUnits=Object.fromEntries(Object.entries(joseon.provinces).map(([key,p])=>[key,{name:p.name,ko:p.ko,hanja:p.hanja,type:'Province',note:'Provincial seat: '+p.seat+(key==='gyeonggi'?', the capital.':'.')}]));

const result=await writeMosaic({
 pieces,out,label:'Korea dated boundaries',
 snapshots:[{year:100,date:'0100-12-31',field:'samhan',units:samhanUnits},{year:1890,date:'1890-12-31',field:'joseon',units:joseonUnits}],
 firstLevel:boundaries.first.features.map(f=>({id:f.properties.id,polygons:polygons(f.geometry)})),
 source:{name:'Cliopatria (Seshat) and county histories',url:manifest.samhan.url,lastDate:'1890-12-31'}
});
const tally=field=>Object.entries(pieces.reduce((n,p)=>({...n,[p[field]||'none']:(n[p[field]||'none']||0)+1}),{})).map(([k,v])=>k+' '+v).join(', ');
console.log('Korea history: '+result.faces+' faces, '+result.edges+' edges, '+result.bytes+' bytes.');
console.log('Samhan pieces: '+tally('samhan'));
console.log('Joseon pieces: '+tally('joseon'));
