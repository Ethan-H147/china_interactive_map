import fs from 'node:fs';
import {createHash} from 'node:crypto';

// Metron3D's CC BY 4.0 scan supplies the sculpture's proportions and drapery.
// The prepared source is welded, simplified and oriented by prepare-liberty-scan.py.
export async function createLibertyCollectible(api){
 const {tri,plinth,palette,getParts}=api;
 const source=JSON.parse(fs.readFileSync(new URL('trophy-sources/liberty-metron.json',import.meta.url),'utf8'));
 const bytes=fs.readFileSync(new URL('trophy-sources/liberty-metron-prepared.glb',import.meta.url));
 if(createHash('sha256').update(bytes).digest('hex')!==source.preparedSha256)throw Error('Prepared Liberty scan checksum differs from its provenance');
 const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12))),offset=28+bytes.readUInt32LE(12),primitive=json.meshes[0].primitives[0];
 function attribute(id){const a=json.accessors[id],v=json.bufferViews[a.bufferView],start=bytes.byteOffset+offset+(v.byteOffset||0)+(a.byteOffset||0),count=a.count*(a.type==='VEC3'?3:1);return a.componentType===5126?new Float32Array(bytes.buffer,start,count):a.componentType===5123?new Uint16Array(bytes.buffer,start,count):new Uint32Array(bytes.buffer,start,count);}
 const positions=attribute(primitive.attributes.POSITION),indices=attribute(primitive.indices),normals=new Float64Array(positions.length);
 for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3,u=[0,1,2].map(k=>positions[b+k]-positions[a+k]),v=[0,1,2].map(k=>positions[c+k]-positions[a+k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];for(const j of [a,b,c])for(let k=0;k<3;k++)normals[j+k]+=n[k];}
 for(let i=0;i<normals.length;i+=3){const d=Math.hypot(...normals.subarray(i,i+3));if(!d)normals[i+1]=1;else for(let k=0;k<3;k++)normals[i+k]/=d;}
 Object.assign(palette,{libertyScanPatina:{color:'#779c8e',metal:.08,rough:.84},libertyScanStone:{color:'#c7bca6',metal:0,rough:.85},libertyScanFlame:{color:'#c39c4a',metal:.7,rough:.45}});
 return{'united-states':{title:'Statue of Liberty',source:{author:source.author,license:source.license,url:source.source,licenseUrl:source.licenseUrl},build(){
  plinth(.72);
  for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]],vs=ids.map(id=>Array.from(positions.subarray(id*3,id*3+3))),y=vs.reduce((sum,p)=>sum+p[1],0)/3,material=y<-.155?'libertyScanStone':y>1.53?'libertyScanFlame':'libertyScanPatina',before=getParts()[material]?.p.length||0;tri(...vs,material);const part=getParts()[material];if(part&&part.p.length>before)part.n.splice(part.n.length-9,9,...ids.flatMap(id=>Array.from(normals.subarray(id*3,id*3+3))));}
 }}};
}
