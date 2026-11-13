import {addAlpineAsianPronunciations} from './alpine-asian-pronunciation-plan.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {decodeData} from '../dist/geo-pack.mjs';
import {spanishNameRows} from '../dist/spanish-names.mjs';
import {addMultilingualPronunciations} from './multilingual-pronunciation-plan.mjs';
import {russiaPlaceNames} from '../dist/russia-names.mjs';
import {addNordicPronunciations} from './nordic-pronunciation-plan.mjs';
import {addBalticPronunciations} from './baltic-pronunciation-plan.mjs';
import {addAsiaPronunciations} from './asia-pronunciation-plan.mjs';
import {addChinaMongolianPronunciations} from './china-mongolian-pronunciation-plan.mjs';
import {addBalkanCentralAsiaPronunciations} from './balkan-central-asia-pronunciation-plan.mjs';
import {addGreeceMoldovaPronunciations} from './greece-moldova-pronunciation-plan.mjs';

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
   const eligible=country==='france'?(r.level===1&&/^FR-R-/.test(r.id)||r.level===2&&['Department','Overseas department'].includes(r.kind)):(r.level===1&&['Autonomous community','Autonomous city'].includes(r.kind)||r.level===2&&['Province','Autonomous city'].includes(r.kind));
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
   if(country==='russia'&&russiaPlaceNames(r).administrativeEn&&russiaPlaceNames(r).pronunciation!==false){
    const display=russiaPlaceNames(r);
    add(country,r.id,r.level,display.en,display.local,'ru',{locale:'ru',russianScope:'urban-okrug',context:'Названия городов и городских округов России. Произнеси только указанное название один раз, естественно и чётко по-русски, без вступления, повтора и музыки.'});
    continue;
   }
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
 await addMultilingualPronunciations(read,add);
 await addNordicPronunciations(read,add);
 await addBalticPronunciations(read,add);
 await addAsiaPronunciations(read,add);
 await addChinaMongolianPronunciations(read,add);
 await addBalkanCentralAsiaPronunciations(read,add);
 await addGreeceMoldovaPronunciations(read,add);
 await addAlpineAsianPronunciations(read,add);
 const mongolia=JSON.parse(gunzipSync(await read('data/mongolia-boundaries.bin')));
 for(const {properties:p}of mongolia.first.features)add('mongolia',p.id,1,p.en,p.mn,'mn',{locale:'mn',context:'Монгол Улсын аймаг болон нийслэлийн нэрийг монгол хэлээр нэг удаа тод, байгалийн байдлаар хэлнэ үү. Зөвхөн заасан нэрийг хэлнэ үү.',voiceSettings:{stability:1,similarity_boost:.75,speed:1}});
 const philippines=JSON.parse(gunzipSync(await read('data/archipelago/philippines-catalogue.bin')));
 for(const r of philippines.records.filter(r=>r.level===1))add('philippines',r.id,1,r.en,r.en,'en',{locale:'en-PH',nameSource:'https://psa.gov.ph/classification/psgc/regions',context:'Read the indicated Philippine region name once, in clear natural Philippine English. These are the English names used by the Philippine Statistics Authority. Pronounce CALABARZON, MIMAROPA and SOCCSKSARGEN as spoken regional acronyms, not as lists of letters. No introduction, repetition or music.',voiceSettings:{stability:1,similarity_boost:.75,speed:1}});
 for(const country of ['argentina','uruguay','chile','costa-rica']){
  const {records}=JSON.parse(gunzipSync(await read('data/europe/'+country+'/catalogue.bin')));
  for(const r of records.filter(r=>r.level===1))add(country,r.id,1,r.en,r.local.trim()||r.en,'es',{locale:{argentina:'es-AR',uruguay:'es-UY',chile:'es-CL','costa-rica':'es-419'}[country]});
 }
 const reading=entries.find(p=>p.key==='united-kingdom:GB-C-E06000038');
 reading.seed=2026110802;reading.synthesisText='Redding';
 reading.voiceSettings={stability:1,similarity_boost:.75,speed:1};
 reading.context='The English town of Reading in Berkshire is pronounced RED-ing, rhyming with wedding. Say the place name in British English.';
 // A user reported a non-speech flourish in the original Maine-et-Loire clip.
 const maine=entries.find(p=>p.key==='france:FR-D-49');
 maine.seed=2026110702;maine.voiceSettings={stability:1,similarity_boost:0.75,speed:1};
 maine.context='Lecture neutre et précise de noms de départements français.';
 const poltava=entries.find(p=>p.key==='ukraine:UA-53');
 poltava.seed=2026110801;poltava.voiceSettings={stability:1,similarity_boost:0.75,speed:0.9};
 poltava.synthesisText='Полта́вська о́бласть';
 poltava.context='Чітка українська дикція. Початковий приголосний П у назві Полтавська область має бути виразним, без пропуску.';
 const articulationFixes={
  'argentina:AR-86':'Pronunciación argentina clara y cuidada: Santiago del Estero. Conserva una ese audible, sin aspirarla ni omitirla, en la sílaba es de Estero: es-te-ro. Lee el nombre completo una sola vez.',
  'uruguay:UY-DU':'Pronunciación uruguaya clara y cuidada: Durazno. Con seseo, la z corresponde a una ese audible antes de la ene: du-ras-no. No aspires ni omitas esa consonante. Lee el nombre una sola vez.',
  'uruguay:UY-LA':'Pronunciación uruguaya clara y cuidada: Lavalleja. Distingue la elle rehilada, con sonido sh o /ʃ/, de la jota española /x/. La secuencia es la-va-lle-ja, con acento en lle. No conviertas la elle en otra jota ni repitas sílabas. Lee el nombre una sola vez.'
 };
 for(const [key,context]of Object.entries(articulationFixes)){
  const entry=entries.find(p=>p.key===key);entry.seed=2026110803;
  entry.context=context;entry.voiceSettings={stability:1,similarity_boost:.75,speed:.9};
 }
 entries.find(p=>p.key==='uruguay:UY-DU').voiceSettings.speed=1;
 {const e=entries.find(p=>p.key==="indonesia:ID31");Object.assign(e,{synthesisText:"[Indonesian accent] Jakarta",context:"Ucapkan nama kota Jakarta dengan pelafalan bahasa Indonesia asli: ja-KAR-ta, dengan vokal a jelas pada setiap suku kata, bukan pelafalan bahasa Inggris. Sebut sekali saja.",voiceSettings:{stability:1,similarity_boost:.75,speed:1}});}
 {const e=entries.find(p=>p.key==="belgium:BE32");Object.assign(e,{synthesisText:"Éno",context:"Prononce le nom de la province belge Hainaut en français : é-no, sans aucun son h initial, sans consonne finale. Dis uniquement le nom une fois.",voiceSettings:{stability:1,similarity_boost:.75,speed:1}});}
 return entries.sort((a,b)=>a.key.localeCompare(b.key));
}
