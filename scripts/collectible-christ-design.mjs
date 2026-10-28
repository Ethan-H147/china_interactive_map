import fs from 'node:fs';
import {createHash} from 'node:crypto';

// JuanG3D's authored Art Deco sculpture, adapted under CC BY 4.0.
// The original tall signed print base is replaced with an atlas display pedestal.
export async function createChristCollectible(api){
 const {tri,plinth,lathe,palette,getParts}=api;
 const source=JSON.parse(fs.readFileSync(new URL('trophy-sources/christ-juan.json',import.meta.url),'utf8'));
 const bytes=fs.readFileSync(new URL('trophy-sources/christ-juan-prepared.glb',import.meta.url));
 if(createHash('sha256').update(bytes).digest('hex')!==source.preparedSha256)throw Error('Prepared Christ model checksum differs from its recorded provenance');
 const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12))),offset=28+bytes.readUInt32LE(12),primitive=json.meshes[0].primitives[0];
 function attribute(id){const a=json.accessors[id],v=json.bufferViews[a.bufferView],start=bytes.byteOffset+offset+(v.byteOffset||0)+(a.byteOffset||0),count=a.count*(a.type==='VEC3'?3:1);return a.componentType===5126?new Float32Array(bytes.buffer,start,count):a.componentType===5123?new Uint16Array(bytes.buffer,start,count):new Uint32Array(bytes.buffer,start,count);}
 const positions=attribute(primitive.attributes.POSITION),indices=attribute(primitive.indices),normals=attribute(primitive.attributes.NORMAL);
 Object.assign(palette,{christSoapstone:{color:'#c5cec5',metal:.01,rough:.84},christPedestal:{color:'#8d998d',metal:0,rough:.89},christPedestalEdge:{color:'#b3bbb0',metal:.015,rough:.82}});
 return{brazil:{title:'Christ the Redeemer',source:{title:source.title,author:source.author,license:source.license,url:source.source,licenseUrl:source.licenseUrl},build(){
  plinth(1.07);
  lathe([[0,-.9925],[.57,-.9925],[.57,-.94],[.52,-.905],[.49,-.905],[.44,-.49],[.48,-.4775],[.48,-.4475],[.43,-.4225],[0,-.4225]],(a,b)=>a[1]<-.90||a[1]>-.49?'christPedestalEdge':'christPedestal',8);
  for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]],vs=ids.map(id=>Array.from(positions.subarray(id*3,id*3+3))),before=getParts().christSoapstone?.p.length||0;tri(...vs,'christSoapstone');const part=getParts().christSoapstone;if(part&&part.p.length>before)part.n.splice(part.n.length-9,9,...ids.flatMap(id=>Array.from(normals.subarray(id*3,id*3+3))));}
 }}};
}
