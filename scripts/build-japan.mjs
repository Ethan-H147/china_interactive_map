import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {lineData} from '../dist/adaptive-lines.mjs';
const dir='scripts/japan-sources/',out='dist/data/';
const raw=JSON.parse(gunzipSync(fs.readFileSync(dir+'prefectures.geojson.gz')));
const rows=JSON.parse(fs.readFileSync(dir+'prefectures.tables.json'))[2].rows;
const names=new Map(rows.map(r=>[r[1],r]));
const fc=features=>({type:'FeatureCollection',features});
for(const f of raw.features){const r=names.get(f.properties.P);if(!r)throw Error(f.properties.P);f.properties={id:r[13],en:r[0],ja:r[1],level:1,country:'JP',capital:String(r[2]).replace(/\[.*?\]/g,''),capitalLocal:r[3],type:r[13]==='JP-13'?'Metropolis':r[13]==='JP-01'?'Dō':r[13]==='JP-26'||r[13]==='JP-27'?'Urban prefecture':'Prefecture'};}
async function simplify(data,interval){const result=await mapshaper.applyCommands(`-i input.json -clean -simplify dp interval=${interval} keep-shapes -o output.json format=geojson precision=0.000001`,{'input.json':JSON.stringify(data)});return JSON.parse(result['output.json']);}
const data=await simplify(raw,15);
const bounds=coords=>{const b=[Infinity,Infinity,-Infinity,-Infinity];function walk(c){if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);}walk(coords);return [[b[0],b[1]],[b[2],b[3]]];};
const area=r=>Math.abs(r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0));
for(const f of data.features){f.properties.bounds=bounds(f.geometry.coordinates);const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;const largest=polygons.toSorted((a,b)=>area(b[0])-area(a[0]))[0];const b=bounds(largest);f.properties.center=[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2];f.properties.focusBounds=f.properties.id==='JP-13'?b:f.properties.bounds;}
const topo=topology({regions:data});const edges=fc([{type:'Feature',properties:{},geometry:mesh(topo,topo.objects.regions)}]);
const write=(name,value)=>fs.writeFileSync(out+name,gzipSync(JSON.stringify(value),{level:9}));
write('japan-boundaries.bin',{first:data,boundaries:edges});
const light=await simplify(data,500);write('japan-context.bin',light);
const contextTopology=topology({regions:light});
const contextEdges=lineData(mesh(contextTopology,contextTopology.objects.regions,(a,b)=>a===b));
write('japan-context-edges.bin',contextEdges);
write('japan-motion.bin',{'japan-first':light,'japan-first-edges':lineData(light),'japan-portal':light});
fs.writeFileSync(out+'japan-source.json',JSON.stringify({retrieved:'2026-10-05',boundarySource:'https://github.com/piuccio/open-data-jp-prefectures-geojson',upstream:'https://nlftp.mlit.go.jp/ksj/',license:'MIT (processing); underlying MLIT data terms apply',processing:'Prefectures dissolved by source author; shared topology cleaned and simplified to 15 m for display. Separate 500 m camera-motion geometry.',prefectures:data.features.length},null,2));
console.log('Japan boundaries:',data.features.length,fs.statSync(out+'japan-boundaries.bin').size);
