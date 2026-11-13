import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gunzipSync,gzipSync} from 'node:zlib';
import {encodeGeo,decodeData,decodeGeoStructure} from '../dist/geo-pack.mjs';
import {fc,command} from './build-regional-dataset.mjs';
import {landIndex,polygons} from './geo-index.mjs';
const mapshaper=createRequire(import.meta.url)('mapshaper');
export const southeastBounds=[-94.5,23.5,-74.5,37.5];
export const southeastSource='scripts/boundary-sources/united-states/physical-coast/';
export const exact=(data,args)=>command(data,args,{precision:.0000001});
export const rectangle=([w,s,e,n])=>fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}}]);
export function boundsOf(geometry){let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;for(const p of polygons(geometry).flat(2)){w=Math.min(w,p[0]);s=Math.min(s,p[1]);e=Math.max(e,p[0]);n=Math.max(n,p[1]);}return[w,s,e,n];}
export const intersects=(a,b)=>a[0]<=b[2]&&b[0]<=a[2]&&a[1]<=b[3]&&b[1]<=a[3];
export async function prepareSoutheastLand(){
 const file=southeastSource+'southeast-land.bin';
 const source=JSON.parse(fs.readFileSync(southeastSource+'southeast.json'));
 if(fs.existsSync(file)){const bytes=fs.readFileSync(file),pin=decodeGeoStructure(gunzipSync(bytes),{select:()=>null}).meta;if(pin.source===source.sha256&&pin.tolerance===.0003)return decodeData(bytes);}
 let data=JSON.parse(gunzipSync(fs.readFileSync(southeastSource+'southeast.json.gz')));
 const line=coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}});
 const lines=fc(data.elements.filter(e=>e.type==='way').map(e=>line(e.geometry.map(p=>[p.lon,p.lat]))));data=null;
 console.log('Preparing canonical physical coast from',lines.features.length,'directed OSM ways');
 const simplified=await exact(lines,'-clip bbox='+southeastBounds.join(',')+' -simplify dp interval=.00002 planar keep-shapes');
 const [w,s,e,n]=southeastBounds,inside=p=>p[0]>w&&p[0]<e&&p[1]>s&&p[1]<n,points=[];
 for(const f of simplified.features){const paths=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;for(const path of paths)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length||!inside(a)||!inside(b))continue;
  const offset=Math.min(.000001,length*.1),x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;
  for(const side of [1,-1])points.push({type:'Feature',properties:{left:side===1?1:0,right:side===-1?1:0},geometry:{type:'Point',coordinates:[x-side*dy/length*offset,y+side*dx/length*offset]}});break;
 }}
 simplified.features.push(line([[w,s],[e,s],[e,n],[w,n],[w,s]]));
 const output=await mapshaper.applyCommands('-i coast.json -polygons -join left.json calc=landPoints=sum(left),waterPoints=sum(right) -filter landPoints>waterPoints -o out.json format=geojson precision=.0000001',{'coast.json':simplified,'left.json':fc(points)});
 let land=JSON.parse(output['out.json']);land.features.forEach(f=>f.properties={});
 land=await exact(land,'-simplify dp interval=.0003 planar keep-shapes');
 const contains=landIndex(land.features.flatMap(f=>polygons(f.geometry)).flat(1));
 for(const point of [[-84.28,30.44],[-85.66,30.22],[-80.3,25.8],[-81.1,32.1],[-77.4,35]])assert(contains(point),'Canonical shore lost mainland '+point);
 for(const point of [[-86.2,30.45],[-85.71,30.16],[-85.557147,30.1063134],[-85.36,29.81],[-87.14,30.41],[-82.55,27.75],[-84,28]]){console.log('Physical water probe',point,!contains(point));assert(!contains(point),'Canonical shore filled a bay or sea '+point);}
 fs.writeFileSync(file,gzipSync(encodeGeo(land,{source:source.sha256,tolerance:.0003}),{level:9}));console.log('Canonical physical shore:',land.features.length,'land polygons');return land;
}
export async function southeastWater(){return exact({'box.json':rectangle(southeastBounds),'land.json':await prepareSoutheastLand()},'-erase land.json');}
