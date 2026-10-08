import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
const read=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const fc=features=>({type:'FeatureCollection',features});
const my='dist/data/southeast-asia/',id='dist/data/archipelago/';
const report=JSON.parse(fs.readFileSync(my+'borneo-border-report.json'));
assert.equal(report.shared.coordinates.length,2,'One continuous mainland border and one continuous Sebatik border');
for(const [path,ends] of [[report.shared.coordinates.find(p=>p.length>100),[[109.644565,2.081301],[117.595563,4.17028]]],[report.shared.coordinates.find(p=>p.length<100),[[117.68345,4.166559],[117.90086,4.166669]]]]){assert(path);assert.deepEqual([path[0],path.at(-1)].sort((a,b)=>a[0]-b[0]),ends,'Shared paths must cover the full land border, coast to coast');}
const distance=(p,a,b)=>{const c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot((p[0]-a[0])*c-u*dx,p[1]-a[1]-u*dy)*111195;};
const paths=collection=>collection.features.flatMap(f=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flat());
function nearestIn(collection){
 const grid=new Map(),cell=.01;
 for(const path of paths(collection))for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push([a,b]);}}
 return p=>Math.min(...(grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]).map(([a,b])=>distance(p,a,b)));
}
const overview=read(id+'indonesia-overview.bin');
const collections=[['Malaysia states',read(my+'malaysia-first.bin')],['Malaysia districts',fc(['MY-12','MY-13'].flatMap(code=>read(my+'malaysia/'+code+'.bin').features))],['Malaysia context',read(my+'malaysia-context.bin')],['Indonesia province overview',overview.first],['Indonesia regency overview',overview.second],['Indonesia context',read(id+'indonesia-context.bin')]];
for(const level of ['first','second'])collections.push(['Indonesia detailed '+level,fc(['ID61','ID64','ID65'].flatMap(code=>read(id+'indonesia-'+code+'.bin')[level].features))]);
const samples=report.shared.coordinates.flatMap(path=>path.slice(1).flatMap((p,i)=>[p,[(p[0]+path[i][0])/2,(p[1]+path[i][1])/2]]));
for(const [name,collection] of collections){const nearest=nearestIn(collection);let max=0;for(const p of samples)max=Math.max(max,nearest(p));assert(max<1,name+' must follow the shared path within rounding precision; got '+max+' m');console.log(name+': '+samples.length+' border samples, maximum separation '+max.toFixed(3)+' m');}
assert(fs.statSync(id+'indonesia-context.bin').size<320000,'Reconciled national context stays under 320 KB compressed');
assert(fs.statSync(my+'malaysia-context.bin').size<150000,'Malaysia context stays under 150 KB compressed');
console.log('Continuous Borneo mainland and Sebatik borders agree at every map level.');
