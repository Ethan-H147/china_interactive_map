const encoder=new TextEncoder(),decoder=new TextDecoder();
export const normalizeLocalityQuery=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const types={u32:Uint32Array,i32:Int32Array,u8:Uint8Array};
function strings(values){const chunks=values.map(s=>encoder.encode(s)),offsets=new Uint32Array(values.length+1);chunks.forEach((v,i)=>offsets[i+1]=offsets[i]+v.length);const bytes=new Uint8Array(offsets.at(-1));chunks.forEach((v,i)=>bytes.set(v,offsets[i]));return {offsets,bytes};}
export function encodeLocalitySearch(records,parents){
 const postings=new Map(),names=strings(records.map(r=>r.en));
 records.forEach((r,id)=>{
  const parent=parents[+r.parentId.slice(7)],name=normalizeLocalityQuery(r.en),words=new Set(normalizeLocalityQuery([r.en,r.parentName,parent[2],r.id.slice(7)].join(' ')).split(' '));
  words.add('^'+name);words.add('@'+r.parentId.slice(7));
  for(const word of words){if(!postings.has(word))postings.set(word,[]);postings.get(word).push(id);}
 });
 const terms=[...postings.keys()].sort(),tokens=strings(terms),ends=new Uint32Array(terms.length+1);terms.forEach((term,i)=>ends[i+1]=ends[i]+postings.get(term).length);
 const ids=new Uint32Array(ends.at(-1));terms.forEach((term,i)=>ids.set(postings.get(term),ends[i]));
 const columns={codes:Uint32Array.from(records,r=>+r.id.slice(7)),parents:Uint32Array.from(records,r=>+r.parentId.slice(7)),kind:Uint8Array.from(records,r=>r.population.value>=2500?1:0),nameOffsets:names.offsets,tokenOffsets:tokens.offsets,postingOffsets:ends,postings:ids,names:names.bytes,tokens:tokens.bytes};
 let size=0;const layout={};for(const [key,array]of Object.entries(columns)){size=Math.ceil(size/4)*4;layout[key]={offset:size,length:array.length,type:array instanceof Int32Array?'i32':array instanceof Uint32Array?'u32':'u8',packed:array.BYTES_PER_ELEMENT===4};size+=array.byteLength;}
 const header=encoder.encode(JSON.stringify({version:2,count:records.length,layout})),start=Math.ceil((8+header.length)/4)*4,output=new Uint8Array(start+size),view=new DataView(output.buffer);view.setUint32(0,0x3149504c,true);view.setUint32(4,header.length,true);output.set(header,8);
 // Delta coding plus byte planes exposes repeated high bytes to gzip without
 // expanding the retained worker representation into JavaScript objects.
 for(const [key,array]of Object.entries(columns)){const offset=start+layout[key].offset;if(!layout[key].packed){output.set(array,offset);continue;}let previous=0;for(let i=0;i<array.length;i++){const delta=array[i]-previous,z=((delta<<1)^(delta>>31))>>>0;previous=array[i];for(let plane=0;plane<4;plane++)output[offset+plane*array.length+i]=z>>>(plane*8)&255;}}return output;
}
export function localityRecord(tuple,manifest){
 const [code,name,lng,lat,parentCode,population,dotzoom,replaces]=tuple,parent=manifest.parents[parentCode],id='MX-LOC-'+String(code).padStart(9,'0'),parentId='MX-MUN-'+String(parentCode).padStart(5,'0');
 return {...manifest.recordDefaults,id,en:name,kind:population>=2500?'City / town':'Village / hamlet',center:[lng,lat],parentId,parent:parentId,provinceId:parent[1],parentName:parent[0],aliases:[name+' '+parent[2],String(code).padStart(9,'0')],population:{...manifest.metricDefaults.population,value:population},dotzoom,minzoom:dotzoom,level:4,settlement:true,bounds:[[lng-.04,lat-.04],[lng+.04,lat+.04]],...(replaces?{replacesLabel:parentId}:{})};
}
export class LocalitySearchIndex{
 constructor(bytes,manifest){
  bytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(view.getUint32(0,true)!==0x3149504c)throw Error('Invalid locality search index');
  const length=view.getUint32(4,true),header=JSON.parse(decoder.decode(bytes.subarray(8,8+length))),start=Math.ceil((8+length)/4)*4;this.count=header.count;this.manifest=manifest;this.columns={};
  for(const [key,c]of Object.entries(header.layout)){const array=new types[c.type](bytes.buffer,bytes.byteOffset+start+c.offset,c.length);if(c.packed){const packed=bytes.slice(start+c.offset,start+c.offset+c.length*4);let value=0;for(let i=0;i<c.length;i++){const z=(packed[i]|packed[c.length+i]<<8|packed[2*c.length+i]<<16|packed[3*c.length+i]<<24)>>>0;value+=(z>>>1)^-(z&1);array[i]=value;}}this.columns[key]=array;}
 }
 token(i){const c=this.columns;return decoder.decode(c.tokens.subarray(c.tokenOffsets[i],c.tokenOffsets[i+1]));}
 lower(word){let lo=0,hi=this.columns.tokenOffsets.length-1;while(lo<hi){const mid=(lo+hi)>>>1;if(this.token(mid)<word)lo=mid+1;else hi=mid;}return lo;}
 visit(word,prefix,callback){const c=this.columns,start=this.lower(word);for(let i=start;i<c.tokenOffsets.length-1;i++){const term=this.token(i);if(prefix?!term.startsWith(word):term!==word)break;for(let j=c.postingOffsets[i];j<c.postingOffsets[i+1];j++)callback(c.postings[j],term===word);}}
 record(i){const c=this.columns,parent=this.manifest.parents[c.parents[i]],en=decoder.decode(c.names.subarray(c.nameOffsets[i],c.nameOffsets[i+1])),code=String(c.codes[i]).padStart(9,'0'),parentId='MX-MUN-'+String(c.parents[i]).padStart(5,'0');return {id:'MX-LOC-'+code,en,kind:c.kind[i]?'City / town':'Village / hamlet',parentId,parent:parentId,parentName:parent[0],provinceId:parent[1],aliases:[en+' '+parent[2],code],level:4,settlement:true,partial:true,searchOrder:i};}
 search(query,limit=20){
  const q=normalizeLocalityQuery(query);if(!q)return [];const marks=new Uint8Array(this.count);this.visit('^'+q,true,(id,exact)=>marks[id]=exact?3:2);
  let words=null;for(const word of q.split(' ')){const next=new Uint8Array(this.count);this.visit(word,true,id=>{if(!words||words[id])next[id]=1;});words=next;}
  for(let i=0;i<this.count;i++)if(words[i]&&!marks[i])marks[i]=1;
  const result=[];for(const mark of [3,2,1])for(let i=0;i<this.count&&result.length<limit;i++)if(marks[i]===mark){const record=this.record(i),names=[record.en,...record.aliases,record.en+' '+record.parentName,record.parentName+' '+record.en].map(normalizeLocalityQuery),rank=names.includes(q)?0:names.some(n=>n.startsWith(q))?1:3-mark;result.push({record,rank});}return result;
 }
 children(parent,query='',offset=0,limit=100){const matches=[],q=normalizeLocalityQuery(query);this.visit('@'+String(parent).slice(7),false,id=>{const record=this.record(id);if(!q||normalizeLocalityQuery(record.en).includes(q)||record.id.endsWith(q))matches.push(record);});matches.sort((a,b)=>a.en.localeCompare(b.en)||a.id.localeCompare(b.id));return {total:matches.length,records:matches.slice(offset,offset+limit)};}
}
