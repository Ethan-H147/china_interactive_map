import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {pronunciationPlan} from './pronunciation-plan.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const i=arg.indexOf('=');return [arg.slice(2,i),arg.slice(i+1)];}));
const root=path.resolve(args.root||fileURLToPath(new URL('../',import.meta.url)));
const output=path.resolve(args.output||path.join(root,'artifacts/elevenlabs-pronunciations'));
const voice=args.voice||'onwK4e9ZLuTAKqWW03F9',model=args.model||'eleven_v4';
const voiceName=args['voice-name']||(voice==='XjLkpWUlnhS8i7gGz3lZ'?'David Castlemore - Newsreader and Educator':voice==='onwK4e9ZLuTAKqWW03F9'?'Daniel - Steady Broadcaster':voice);
const context={pl:'Nazwy polskich województw, wymawiane po polsku.',hu:'Magyar vármegyék és Budapest neve, magyar kiejtéssel.',uk:'Назви адміністративних одиниць України українською мовою.',ro:'Numele județelor României și al municipiului București, pronunțate în română.',cs:'Názvy krajů České republiky vyslovované česky.',sk:'Názvy krajov Slovenska vyslovované po slovensky.',vi:'Đọc tên các tỉnh và thành phố bằng tiếng Việt.',ja:'日本の都道府県名を日本語で読みます。',tr:'Türkiye illerinin adları, Türkçe telaffuz.',zh:'以下是中国省级行政区名称的普通话读音。',fr:'Voici des noms de lieux prononcés en français de France.',es:'Estos son nombres de lugares pronunciados en español de España.',ko:'다음은 한국어 행정구역 이름입니다.'};
const hash=value=>createHash('sha256').update(value).digest('hex');
const fullPlan=await pronunciationPlan(root);
const only=args.only?new Set(args.only.split(',')):null;
const plan=only?fullPlan.filter(p=>only.has(p.key)):fullPlan;
if(only&&plan.length!==only.size)throw Error('Unknown selected pronunciation key');
const installed=(await import(pathToFileURL(path.join(root,'dist/place-pronunciations.mjs')))).placePronunciations;
const localeContext={ru:'Нейтральное произношение названий регионов России.',de:'Die Namen der deutschen Bundesländer.',it:'Nomi delle regioni e delle province italiane.',
'en-US':'These are United States place names, pronounced in American English.',
'en-CA':'These are Canadian province and territory names, pronounced in Canadian English.',
'fr-CA':'Voici des noms de provinces et de territoires prononcés en français canadien, avec un accent québécois.',
'es-MX':'Estos son nombres de entidades federativas de México, pronunciados en español mexicano, con seseo: la z y la c ante e o i se pronuncian como s, nunca como la z castellana.',
'pt-BR':'Estes são nomes dos estados do Brasil, pronunciados em português brasileiro.',
'pt-PT':'Estes são nomes de distritos e regiões de Portugal, pronunciados em português europeu de Portugal.'};
const accentTags={'es-MX':'[Mexican Spanish accent] ','fr-CA':'[Canadian French accent] ','pt-BR':'[Brazilian Portuguese accent] ','pt-PT':'[European Portuguese accent] '};
await fs.mkdir(output,{recursive:true});
const checkpoint=path.join(output,'progress.json');
let saved={};try{saved=JSON.parse(await fs.readFile(checkpoint,'utf8'));}catch{}
let key=process.env.ELEVENLABS_API_KEY;
if(!key){
 if(!process.stdin.isTTY)throw Error('Set ELEVENLABS_API_KEY, or use hidden interactive stdin.');
 process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');process.stdin.resume();
 console.log('Ready for hidden credential input');
 key=await new Promise(resolve=>{let input='';const receive=chunk=>{input+=chunk;if(/[\r\n]/.test(input)){process.stdin.off('data',receive);process.stdin.setRawMode(false);process.stdin.pause();resolve(input.trim());}};process.stdin.on('data',receive);});
}
const headers={'xi-api-key':key,'Content-Type':'application/json'};
async function failure(response){let body;try{body=await response.json();}catch{}return Error(('ElevenLabs '+response.status+': '+(body?.detail?.message||body?.detail?.status||response.statusText)).replaceAll(key,'[redacted]'));}
try{
 if(model==='eleven_multilingual_v2')throw Error('Choose a model with explicit language support.');
 console.log('Using '+model+' with explicit languages and local accents; voice '+voice+'; '+plan.length+' cards.');
 const entries=only?{...installed}:{},voiceSettings={stability:0.5,similarity_boost:0.75,speed:1};
 for(const [i,p]of plan.entries()){
  const preceding=p.context||localeContext[p.locale]||localeContext[p.language]||context[p.language],settings=p.voiceSettings||voiceSettings;
  if(!preceding)throw Error('Missing language context for '+p.key);
  const synthesisText=(accentTags[p.locale]||'')+p.text;
  const body={text:synthesisText,model_id:model,language_code:p.language,previous_text:preceding,voice_settings:settings,...(p.seed===undefined?{}:{seed:p.seed})};
  const fingerprint=hash(JSON.stringify({voice,body,format:'mp3_44100_128'})),file=path.join(output,p.src);
  let data;try{if(saved[p.key]?.fingerprint===fingerprint){data=await fs.readFile(file);if(hash(data)!==saved[p.key].sha256)data=null;}}catch{}
  if(!data){
   const result=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+voice+'?output_format=mp3_44100_128',{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
   if(!result.ok)throw await failure(result);
   data=Buffer.from(await result.arrayBuffer());
   if(data.length<1000||!(data.subarray(0,3).toString()==='ID3'||data[0]===255))throw Error('Invalid MP3 response for '+p.key);
   await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);
   saved[p.key]={fingerprint,sha256:hash(data),bytes:data.length,generatedAt:new Date().toISOString(),requestId:result.headers.get('request-id')};
   await fs.writeFile(checkpoint,JSON.stringify(saved,null,2)+'\n');
  }
  entries[p.key]={...p,provider:'ElevenLabs',voice,model,context:preceding,synthesisText,voiceSettings:settings,bytes:data.length,sha256:hash(data),generatedAt:saved[p.key].generatedAt,synthetic:true,reviewed:false,...(saved[p.key].editing?{editing:saved[p.key].editing}:{})};
  console.log((i+1)+'/'+plan.length,p.key,p.text,data.length);
 }
 const metadata={provider:'ElevenLabs',voice,voiceName,model,languages:[...new Set(Object.values(entries).map(p=>p.language))],locales:[...new Set(Object.values(entries).map(p=>p.locale||p.language))],synthetic:true,reviewed:false,generatedAt:new Date().toISOString(),format:'mp3_44100_128'};
 await fs.writeFile(path.join(output,'place-pronunciations.mjs'),'// Generated by scripts/prepare-elevenlabs-pronunciations.mjs.\nexport const pronunciationRelease='+JSON.stringify(metadata)+';\nexport const placePronunciations='+JSON.stringify(entries)+';\n');
 const china=Object.fromEntries(Object.values(entries).filter(p=>p.country==='china').map(p=>[p.id,p]));
 await fs.writeFile(path.join(output,'china-pronunciations.mjs'),'// Generated by scripts/prepare-elevenlabs-pronunciations.mjs.\nexport const pronunciationMetadata='+JSON.stringify({...metadata,language:'zh-CN'})+';\nexport const chinaPronunciations='+JSON.stringify(china)+';\n');
 console.log('Complete:',Object.keys(entries).length,'recordings;',Object.values(entries).reduce((n,p)=>n+p.bytes,0),'bytes. Activate these files only after validation.');
}catch(error){console.error(String(error.message).replaceAll(key,'[redacted]'));process.exitCode=1;}
process.exit(process.exitCode||0);
