import fs from 'node:fs/promises';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root='scripts/japan-sources/municipalities/';
await fs.mkdir(root,{recursive:true});
const page='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html';
const html=await fetch(page).then(r=>{if(!r.ok)throw Error(r.status);return r.text();});
async function range(url,spec){const r=await fetch(url,{headers:{Range:'bytes='+spec}});if(r.status!==206)throw Error('Selective archive access unavailable: '+r.status);return Buffer.from(await r.arrayBuffer());}
async function getPrefecture(code){
 const file=root+code+'.geojson';try{await fs.access(file);const saved=JSON.parse(await fs.readFile(root+code+'-source.json','utf8'));if(saved.member==='N03-20260101_'+code+'.geojson')return;}catch{}
 const name='N03-20260101_'+code+'_GML.zip',relative=html.match(new RegExp("'([^']*/"+name+")'"))?.[1];if(!relative)throw Error('Official download missing: '+code);
 const url=new URL(relative,page).href,tail=await range(url,'-65536'),end=tail.lastIndexOf(Buffer.from('504b0506','hex')),offset=tail.readUInt32LE(end+16),length=tail.readUInt32LE(end+12),directory=await range(url,offset+'-'+(offset+length-1));
 let member;for(let p=0;p<directory.length;){const len=directory.readUInt16LE(p+28),name=directory.subarray(p+46,p+46+len).toString();if(name==='N03-20260101_'+code+'.geojson')member={name,method:directory.readUInt16LE(p+10),compressed:directory.readUInt32LE(p+20),bytes:directory.readUInt32LE(p+24),offset:directory.readUInt32LE(p+42)};p+=46+len+directory.readUInt16LE(p+30)+directory.readUInt16LE(p+32);}
 if(!member)throw Error('No GeoJSON: '+code);const header=await range(url,member.offset+'-'+(member.offset+1023)),start=member.offset+30+header.readUInt16LE(26)+header.readUInt16LE(28),compressed=await range(url,start+'-'+(start+member.compressed-1)),raw=member.method===8?inflateRawSync(compressed):compressed;
 if(raw.length!==member.bytes)throw Error('Truncated '+code);JSON.parse(raw);await fs.writeFile(file,raw);await fs.writeFile(root+code+'-source.json',JSON.stringify({url,member:member.name,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),date:'2026-01-01',retrieved:'2026-10-06'},null,2));console.log('Downloaded prefecture',code,raw.length);
}
const codes=process.argv.slice(2).length?process.argv.slice(2):Array.from({length:47},(_,i)=>String(i+1).padStart(2,'0'));
let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<codes.length)await getPrefecture(codes[cursor++]);}));
try{await fs.access(root+'roman.zip');}catch{
 const page='https://www.post.japanpost.jp/service/search/zipcode/download/roman-zip.html',html=await fetch(page).then(r=>r.text()),link=html.match(/href=["']([^"']*KEN_ALL_ROME\.zip)["']/i)?.[1];if(!link)throw Error('Japan Post roman-name download missing');const url=new URL(link,page).href,r=await fetch(url);if(!r.ok)throw Error('Japan Post '+r.status);await fs.writeFile(root+'roman.zip',Buffer.from(await r.arrayBuffer()));await fs.writeFile(root+'roman-source.json',JSON.stringify({url,page,retrieved:'2026-10-06'}));console.log('Downloaded Japan Post romanized names');
}
