// SCAR Antarctic Digital Database coastline: GeoPackage (EPSG:3031) to geographic GeoJSON.
// Land, ice shelves, ice tongues and rumples form one outline, as satellite imagery shows them.
// Simplification runs in the polar plane, where distances are true near the pole; the result is
// split along 0°/180° and closed through the pole, like Natural Earth's continent ring.
import {command,fc} from './build-regional-dataset.mjs';
const a=6378137,e=Math.sqrt(0.00669437999014),radians=Math.PI/180;
// EPSG:3031 polar stereographic (variant B), standard parallel 71°S, central meridian 0°.
const tc=Math.tan(Math.PI/4-71*radians/2)/((1-e*Math.sin(71*radians))/(1+e*Math.sin(71*radians)))**(e/2);
const mc=Math.cos(71*radians)/Math.sqrt(1-e*e*Math.sin(71*radians)**2);
export function geographic([x,y]){
 const rho=Math.hypot(x,y);if(rho<1e-6)return [0,-90];
 const t=rho*tc/(a*mc);let phi=Math.PI/2-2*Math.atan(t);
 for(let i=0;i<12;i++){const s=e*Math.sin(phi);phi=Math.PI/2-2*Math.atan(t*((1-s)/(1+s))**(e/2));}
 return [Math.atan2(x,y)/radians,-phi/radians];
}
export function projected([lon,lat]){
 const phi=-lat*radians,s=e*Math.sin(phi),t=Math.tan(Math.PI/4-phi/2)/((1-s)/(1+s))**(e/2),rho=a*mc*t/tc;
 return [rho*Math.sin(lon*radians),rho*Math.cos(lon*radians)];
}
// GeoPackage geometry: a "GP" header with an optional envelope, then ISO WKB.
function wkb(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let offset=8+[0,32,48,48,64][(bytes[3]>>1)&7];
 const geometry=()=>{
  const le=view.getUint8(offset)===1;offset++;const type=view.getUint32(offset,le);offset+=4;
  const base=type%1000,dims=type>=3000?4:type>=1000?3:2;
  const count=()=>{const n=view.getUint32(offset,le);offset+=4;return n;};
  const ring=()=>Array.from({length:count()},()=>{const p=[view.getFloat64(offset,le),view.getFloat64(offset+8,le)];offset+=8*dims;return p;});
  if(base===3)return [Array.from({length:count()},ring)];
  if(base===6)return Array.from({length:count()},()=>geometry()[0]);
  throw Error('Unexpected coastline geometry type '+type);
 };
 return geometry();
}
export function readAddCoast(file){
 const {DatabaseSync}=globalThis.process.getBuiltinModule('node:sqlite');
 const db=new DatabaseSync(file,{readOnly:true});
 const {table_name:table,column_name:column,srs_id:srs}=db.prepare('select table_name,column_name,srs_id from gpkg_geometry_columns').get();
 if(srs!==3031)throw Error('ADD coastline must use EPSG:3031');
 const features=[];
 for(const row of db.prepare(`select surface,"${column}" as geom from "${table}"`).iterate())features.push({type:'Feature',properties:{surface:row.surface},geometry:{type:'MultiPolygon',coordinates:wkb(row.geom)}});
 db.close();return fc(features);
}
// A ring of one half-plane, converted to longitude/latitude. Vertices on the cut take the half's
// meridian (0° or ±180°); the cut's crossing of the pole becomes a segment along 90°S.
function geographicRing(ring,east){
 const out=[],edge=p=>Math.abs(p[0])<1e-3;
 const lon=p=>edge(p)?(p[1]>0?0:east?180:-180):geographic(p)[0];
 const push=p=>{const last=out.at(-1);if(!last||last[0]!==p[0]||last[1]!==p[1])out.push(p);};
 for(let i=0;i<ring.length;i++){
  const p=ring[i],q=ring[i+1];
  push([lon(p),geographic(p)[1]]);
  if(q&&edge(p)&&edge(q)&&Math.sign(p[1])!==Math.sign(q[1])){push([lon(p),-90]);push([lon(q),-90]);}
 }
 if(out[0][0]!==out.at(-1)[0]||out[0][1]!==out.at(-1)[1])out.push(out[0]);
 return out.map(([x,y])=>[Math.round(x*1e6)/1e6,Math.round(y*1e6)/1e6]);
}
// interval: simplification tolerance in metres (0 keeps the source vertices).
export async function addCoastOutline(coast,{interval=0,minArea=0}={}){
 const steps=['-dissolve2 copy-fields=none','-clean'];
 if(interval)steps.push(`-simplify interval=${interval} planar keep-shapes`);
 if(minArea)steps.push(`-filter-islands min-area=${minArea}`);
 const plane=await command(coast,steps.join(' '),{precision:null}),halves=[];
 for(const east of [true,false]){
  const half=await command(plane,`-clip bbox=${east?'0,-5e6,5e6,5e6':'-5e6,-5e6,0,5e6'}`,{precision:null});
  for(const f of half.features)for(const polygon of f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates)halves.push({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:polygon.map(r=>geographicRing(r,east))}});
 }
 const joined=await command(fc(halves),'-dissolve2 copy-fields=none -clean',{precision:null});
 return fc(joined.features.map(f=>({type:'Feature',properties:{country:'antarctica'},geometry:f.geometry})));
}
