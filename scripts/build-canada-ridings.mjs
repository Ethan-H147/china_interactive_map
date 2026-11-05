import fs from 'node:fs';
import {createRequire} from 'node:module';
import {command,fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {root,input,read,write,modern,featureOf,frame,clean} from './canada-map-geometry.mjs';
const {topology}=createRequire(import.meta.url)('topojson-server');
const base=fc(modern.features.map(f=>({...f,properties:{modern:f.properties.id}})));
for(const name of fs.readdirSync(input).filter(f=>/^riding-\d+\.json$/.test(f))){
 const year=+name.slice(7,11),file='elections/ridings-'+year+'.bin';
 if(process.env.CANADA_RIDING_ORDER&&+process.env.CANADA_RIDING_ORDER!==year)continue;
 if(process.argv.includes('--resume')&&fs.existsSync(root+file))continue;
 const raw=read(input+name);
 let layer=fc(raw.features.map(f=>featureOf(String(f.properties.fedid||f.properties.ED_CF_NUM),f.geometry)));
 if(year===1905){
  const repair=fc(read(input+'riding-1903.json').features.filter(f=>['190335024','190335025','190335040'].includes(f.properties.fedid)).map(f=>featureOf('1905'+f.properties.fedid.slice(4),f.geometry)));
  const outside=await command({'source.json':layer,'repair.json':repair},'-erase repair.json',{precision:.000001});
  layer=fc([...outside.features,...repair.features]);
 }
 const flat=clean(await command({'modern.json':base,'dated.json':layer},'-i dated.json -union target=* -filter "!!modern" -explode',{precision:.000001}));
 const t=topology({flat}),shared=new Map(),near=new Map(),bounds=[];
 // The largest common shore contact assigns a sliver to its adjoining riding.
 // Regions outside early electoral coverage are kept uncoloured.
 for(const [i,g] of t.objects.flat.geometries.entries()){
  const id=flat.features[i].properties.id;if(!id)continue;
  for(const a of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a)))shared.set(a,id);
  const [w,s,e,n]=bounds[i]=flat.features[i].geometry.coordinates.flat(1).reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[180,90,-180,-90]);
  const p=[(w+e)/2,(s+n)/2],modern=flat.features[i].properties.modern;
  if(!near.has(modern))near.set(modern,[]);near.get(modern).push({id,p,box:bounds[i]});
 }
 for(const [i,g] of t.objects.flat.geometries.entries()){
  const f=flat.features[i];if(f.properties.id)continue;
  const votes=new Map();
  for(const a of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))){
   const id=shared.get(a);if(!id)continue;
   const pts=t.arcs[a];let length=0;for(let j=1;j<pts.length;j++)length+=Math.hypot((pts[j][0]-pts[j-1][0])*Math.cos(pts[j][1]*Math.PI/180),pts[j][1]-pts[j-1][1]);votes.set(id,(votes.get(id)||0)+length);
  }
  const area=geographicAreaKm2(f.geometry);
  if(votes.size&&(year>=1947||area<25)){f.properties.id=[...votes].sort((a,b)=>b[1]-a[1])[0][0];continue;}
  // Disconnected islands are matched within the same present-day province. For
  // early orders the match must be local; unrepresented areas remain blank.
  const p=f.geometry.coordinates[0][0];let dist=Infinity,best;
  for(const a of near.get(f.properties.modern)||[]){
   const [w,s,e,n]=a.box,x=Math.max(w-p[0],p[0]-e,0)*Math.cos(p[1]*Math.PI/180),y=Math.max(s-p[1],p[1]-n,0),d=Math.hypot(x,y)+Math.hypot((p[0]-a.p[0])*Math.cos(p[1]*Math.PI/180),p[1]-a.p[1])*.01;
   if(d<dist){dist=d;best=a.id;}
  }
  if(best&&(year>=1947||dist<.035&&area<10))f.properties.id=best;
 }
 const regions=await command(fc(flat.features.filter(f=>f.properties.id)),'-dissolve2 id',{precision:.000001});
 const result=await frame(regions),names=new Map(raw.features.map(f=>[String(f.properties.fedid||f.properties.ED_CF_NUM),f.properties.fedname||f.properties.ED_NAMEE]));
 for(const unit of result.units)Object.assign(unit,{key:unit.id,name:names.get(unit.id)||unit.id,type:'Federal riding'});
 write(file,result,true);console.log(year,result.units.length,(fs.statSync(root+file).size/1e6).toFixed(2)+' MB');
}
