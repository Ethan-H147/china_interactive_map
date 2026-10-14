// Lossless packed form of China's display boundaries, city districts and fill fragments.
// Each coordinate pair is stored once as exact float64 bits; every ring and line
// refers to its points by index. Decoding reproduces the original JSON exactly.
//
// Layout before gzip: "BAP1", u32 structure bytes, u32 point count, structure
// JSON (coordinates replaced by {"$":[first,delta,count,...]} index runs), then
// points as x column and y column. Each column stores zigzag 64-bit differences
// between consecutive bit patterns, split into eight byte planes for compression.

const magic=[66,65,80,49];
const bitsKey=value=>Object.is(value,-0)?'-0':String(value);
const isPath=value=>Array.isArray(value)&&value.length>0&&Array.isArray(value[0])&&typeof value[0][0]==='number';

export function encodePack(input){
 const index=new Map(),xs=[],ys=[];
 function encodePath(path){
  const ids=path.map(([x,y])=>{const key=bitsKey(x)+','+bitsKey(y);let id=index.get(key);if(id===undefined){id=xs.length;index.set(key,id);xs.push(x);ys.push(y);}return id;});
  const runs=[ids[0]];
  for(let i=1;i<ids.length;){const step=ids[i]-ids[i-1];let count=1;while(i+count<ids.length&&ids[i+count]-ids[i+count-1]===step)count++;runs.push(step,count);i+=count;}
  return {$:runs};
 }
 const coordinates=value=>isPath(value)?encodePath(value):typeof value[0]==='number'?value:value.map(coordinates);
 function encode(value){
  if(Array.isArray(value))return value.map(encode);
  if(!value||typeof value!=='object')return value;
  if(value.type&&'coordinates' in value)return {...value,coordinates:coordinates(value.coordinates)};
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='properties'?item:encode(item)]));
 }
 // Subdivisions first: their rings contain every shared province and line point,
 // so later geometry mostly becomes runs over existing indices.
 const order=['subdivisions','provinces','boundaries','annotations'];
 const display=Object.fromEntries(order.filter(key=>key in input.display).map(key=>[key,encode(input.display[key])]));
 for(const key of Object.keys(input.display))if(!(key in display))display[key]=encode(input.display[key]);
 const structure={display:Object.fromEntries(Object.keys(input.display).map(key=>[key,display[key]])),districts:encode(input.districts),fragments:encode(input.fragments),lineOmissions:input.lineOmissions,sources:input.sources};
 const text=new TextEncoder().encode(JSON.stringify(structure));
 const count=xs.length,values=new BigUint64Array(count*2);
 const bits=new BigInt64Array(new Float64Array([...xs,...ys]).buffer);
 for(let i=0;i<bits.length;i++){
  const delta=BigInt.asIntN(64,i===0||i===count?bits[i]:bits[i]-bits[i-1]);
  values[i]=BigInt.asUintN(64,(delta<<1n)^(delta>>63n));
 }
 const raw=new Uint8Array(values.buffer),planes=new Uint8Array(raw.length),total=values.length;
 for(let i=0;i<total;i++)for(let k=0;k<8;k++)planes[k*total+i]=raw[i*8+k];
 const out=new Uint8Array(12+text.length+planes.length),view=new DataView(out.buffer);
 out.set(magic,0);view.setUint32(4,text.length,true);view.setUint32(8,count,true);out.set(text,12);out.set(planes,12+text.length);
 return out;
}

export function decodePack(bytes){
 bytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(magic.some((b,i)=>bytes[i]!==b))throw Error('Not a packed boundary file');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const textLength=view.getUint32(4,true),count=view.getUint32(8,true),total=count*2;
 const structure=JSON.parse(new TextDecoder().decode(bytes.subarray(12,12+textLength)));
 const planes=bytes.subarray(12+textLength),points=new Float64Array(total),words=new Uint32Array(points.buffer);
 if(planes.length!==total*8)throw Error('Packed boundary file is truncated');
 let lo=0,hi=0;
 for(let i=0;i<total;i++){
  if(i===0||i===count){lo=0;hi=0;}
  const zlo=(planes[i]|planes[total+i]<<8|planes[2*total+i]<<16|planes[3*total+i]<<24)>>>0;
  const zhi=(planes[4*total+i]|planes[5*total+i]<<8|planes[6*total+i]<<16|planes[7*total+i]<<24)>>>0;
  const mask=-(zlo&1)>>>0;
  const dlo=((zlo>>>1|zhi<<31)^mask)>>>0,dhi=((zhi>>>1)^mask)>>>0;
  const sum=lo+dlo;lo=sum>>>0;hi=(hi+dhi+(sum>4294967295?1:0))>>>0;
  // Float64Array uses platform byte order; every supported browser is little-endian.
  words[2*i]=lo;words[2*i+1]=hi;
 }
 function decodePath(runs){
  let id=runs[0];const path=[[points[id],points[count+id]]];
  for(let k=1;k<runs.length;k+=2)for(let n=0;n<runs[k+1];n++){id+=runs[k];path.push([points[id],points[count+id]]);}
  return path;
 }
 const coordinates=value=>value&&value.$?decodePath(value.$):typeof value[0]==='number'?value:value.map(coordinates);
 function decode(value){
  if(Array.isArray(value))return value.map(decode);
  if(!value||typeof value!=='object')return value;
  if(value.type&&'coordinates' in value)return {...value,coordinates:coordinates(value.coordinates)};
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='properties'?item:decode(item)]));
 }
 return {display:decode(structure.display),districts:decode(structure.districts),fragments:decode(structure.fragments),lineOmissions:structure.lineOmissions||{},sources:structure.sources};
}
