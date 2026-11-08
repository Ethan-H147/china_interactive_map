import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {decodeData} from '../dist/geo-pack.mjs';
import {spanishNameRows} from '../dist/spanish-names.mjs';

export async function pronunciationPlan(root=fileURLToPath(new URL('../',import.meta.url))){
 const read=file=>fs.readFile(path.join(root,'dist',file));const entries=[];
 const add=(country,id,level,en,text,language,extra={})=>entries.push({key:country+':'+id+(extra.variant?':'+extra.variant:''),country,id:String(id),level,en,text,language,src:country==='china'?'audio/china/zh-CN/'+id+'.mp3':'audio/pronunciation/'+country+'/'+language+'/'+id+'.mp3',...extra});
 const china=JSON.parse(await read('data/china-regions.json'));
 const app=await fs.readFile(path.join(root,'dist/app.js'),'utf8');
 const english=Function('return '+app.match(/const english=(\{[^;]+\});/)[1])();
 for(const {properties:p}of china.provinces)add('china',p.adcode,1,english[p.adcode],p.name,'zh');
 for(const country of ['france','spain']){
  const {records}=JSON.parse(gunzipSync(await read('data/europe/'+country+'/catalogue.bin')));
  for(const r of records){
   const eligible=country==='france'?(r.level===1&&/^FR-R-\d{2}$/.test(r.id)||r.level===2&&['Department','Overseas department'].includes(r.kind)):(r.level===1&&['Autonomous community','Autonomous city'].includes(r.kind)||r.level===2&&['Province','Autonomous city'].includes(r.kind));
   if(!eligible)continue;
   const text=country==='spain'?spanishNameRows(r).find(([,lang])=>lang==='es')?.[2]:r.local;
   if(!text||text.includes('/'))throw Error('Expected one national-language name: '+r.id);
   add(country,r.id,r.level,r.en,text,country==='france'?'fr':'es');
  }
 }
 const korea=await decodeData(new Uint8Array(await read('data/korea-boundaries.bin')),{select:value=>({first:value.first.features.map(f=>f.properties)})});
 for(const p of korea.first)add('korea',p.id,1,p.en,p.ko,'ko',{polity:p.country});

 for(const country of ['russia','germany','italy','united-states','canada','mexico','brazil','portugal','vietnam','turkey','poland','hungary','ukraine','romania','czechia','slovakia']){
  const file=country==='russia'?'data/russia/catalogue.bin':'data/europe/'+country+'/catalogue.bin';
  const {records}=JSON.parse(gunzipSync(await read(file)));
  for(const r of records){
   if(country==='turkey'?r.level!==2:r.level!==1&&!(country==='italy'&&r.level===2))continue;
   const language={russia:'ru',germany:'de',italy:'it','united-states':'en',canada:'en',mexico:'es',brazil:'pt',portugal:'pt',vietnam:'vi',turkey:'tr',poland:'pl',hungary:'hu',ukraine:'uk',romania:'ro',czechia:'cs',slovakia:'sk'}[country];
   const text=country==='canada'||country==='united-states'?r.en:r.local.split('/')[0].trim();
   const locale={'united-states':'en-US',canada:'en-CA',mexico:'es-MX',brazil:'pt-BR',portugal:'pt-PT'}[country]||language;
   add(country,r.id,r.level,r.en,text,language,{locale});
   if(country==='canada')add(country,r.id,r.level,r.en,r.local,'fr',{variant:'fr',locale:'fr-CA'});
  }
 }
 const japan=JSON.parse(gunzipSync(await read('data/japan-boundaries.bin')));
 for(const f of japan.first.features){const p=f.properties;add('japan',p.id,1,p.en,p.ja,'ja');}
 // A user reported a non-speech flourish in the original Maine-et-Loire clip.
 const maine=entries.find(p=>p.key==='france:FR-D-49');
 maine.seed=2026110702;maine.voiceSettings={stability:1,similarity_boost:0.75,speed:1};
 maine.context='Lecture neutre et précise de noms de départements français.';
 return entries.sort((a,b)=>a.key.localeCompare(b.key));
}
