import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/central-asian-frontiers/';
export const countries={kazakhstan:{q:'Q232',iso:'KAZ'},kyrgyzstan:{q:'Q813',iso:'KGZ'},uzbekistan:{q:'Q265',iso:'UZB'},tajikistan:{q:'Q863',iso:'TJK'},turkmenistan:{q:'Q874',iso:'TKM'}};
export async function retain(name,url,extra={}){
 fs.mkdirSync(root,{recursive:true});const mf=root+'sources.json',meta=fs.existsSync(mf)?JSON.parse(fs.readFileSync(mf)):{retrieved:'2026-10-26',files:{}};let bytes;
 if(fs.existsSync(root+name+'.gz'))bytes=gunzipSync(fs.readFileSync(root+name+'.gz'));else{const r=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (https://github.com/Ethan-H147/china_interactive_map)'},signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(name+' HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());fs.writeFileSync(root+name+'.gz',gzipSync(bytes,{level:9}));}
 const sha256=createHash('sha256').update(bytes).digest('hex');if(meta.files[name]){if(meta.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);}else{meta.files[name]={url,sha256,bytes:bytes.length,...extra};fs.writeFileSync(mf,JSON.stringify(meta,null,2)+'\n');}console.log(name,bytes.length);return JSON.parse(bytes);
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('fetch-central-asian-frontiers.mjs'))for(const[c,d]of Object.entries(countries)){
 const entity=(await retain(c+'-wikidata.json','https://www.wikidata.org/wiki/Special:EntityData/'+d.q+'.json',{license:'CC0'})).entities[d.q],id=Number(entity.claims.P402.find(s=>!s.qualifiers?.P582).mainsnak.datavalue.value);
 await retain(c+'.json','https://www.openstreetmap.org/api/0.6/relation/'+id+'/full.json',{relation:id,country:c,license:'ODbL 1.0',credit:'© OpenStreetMap contributors',page:'https://www.openstreetmap.org/relation/'+id});
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('fetch-central-asian-frontiers.mjs'))await retain('shirin-geocode.json','https://nominatim.openstreetmap.org/search?q=Shirin%2C%20Uzbekistan&format=json&limit=5',{license:'ODbL 1.0',credit:'OpenStreetMap contributors'});
