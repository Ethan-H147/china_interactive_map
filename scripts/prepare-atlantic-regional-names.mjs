import fs from 'node:fs';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return [a.slice(2,i),a.slice(i+1)];}));
const root=args.root||process.cwd(),out=args.output||root,source=args.sources||fileURLToPath(new URL('./name-sources/atlantic/',import.meta.url));
const {scopes,regionScopes,languages}=await import(new URL('scopes.mjs','file:///'+source.replaceAll('\\','/')+'/'));
const read=p=>{const b=fs.readFileSync(p);return JSON.parse(b[0]===31?gunzipSync(b):b);};
const write=(file,data)=>{const p=path.join(out,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,file.endsWith('.bin')?gzipSync(JSON.stringify(data),{level:9}):JSON.stringify(data,null,2)+'\n');};
const snapshots=['uk-wikidata.json','fr-admin.json',...fs.readdirSync(source).filter(f=>/^codes-.*\.json$/.test(f))];
const bindings=snapshots.flatMap(file=>read(path.join(source,file)).results.bindings.map(b=>({...b,snapshot:file})));
const byCode=new Map(),byQid=new Map();
for(const b of bindings){const property=b.property?.value.split('/').pop()||(b.snapshot.startsWith('uk-')?'P836':'P374'),key=property+':'+b.code.value,qid=b.item.value.split('/').pop();for(const [map,id]of [[byCode,key],[byQid,qid]]){if(!map.has(id))map.set(id,[]);map.get(id).push(b);}}
const cats={},totals={},conflicts=[];
for(const country of ['united-kingdom','france'])cats[country]=read(path.join(root,'dist/data/europe/'+country+'/catalogue.bin'));
const ukIndex=new Map(cats['united-kingdom'].records.map(r=>[r.id,r]));
function ukLanguages(r){
 const chain=[];let p=r;while(p){chain.push(p.id,p.region,p.provinceId);p=ukIndex.get(p.parent||p.parentId);}
 const code=r.code||r.provenance?.code||r.id.match(/(?:GB-[CDS]-)([A-Z]\d{8})$/)?.[1]||'';
 if(chain.includes('GB-R-TLL')||code.startsWith('W'))return ['cy'];
 if(chain.includes('GB-R-TLM')||code.startsWith('S'))return ['gd','sco'];
 if(chain.includes('GB-R-TLN')||code.startsWith('N'))return ['ga'];
 if(chain.includes('GB-C-E06000052'))return ['kw'];
 return [];
}
function frLanguages(r){const dep=r.level===2?r.id.slice(5):r.parent?.slice(5);return Object.keys(scopes).filter(l=>r.level===1?regionScopes[l].includes(r.id.slice(5)):scopes[l].includes(dep));}
const identities=read(path.join(source,'uk-identities.json')).results.bindings;
const identityKey=s=>s?.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function namesFrom(bindings,allowed,id,english){
 if(english&&id.startsWith('GB-')){const exact=new Set(identities.filter(b=>identityKey(b.english.value)===identityKey(english)).map(b=>b.item.value));const matching=bindings.filter(b=>exact.has(b.item.value));if(matching.length)bindings=matching;}
 const names=[];for(const lang of allowed){const matches=bindings.filter(b=>b.name['xml:lang']===lang),distinct=[...new Set(matches.map(b=>b.name.value.trim()))];if(distinct.length>1){conflicts.push({id,lang,values:distinct});continue;}if(!distinct.length)continue;const b=matches[0],text=distinct[0];if(!text||/[\p{Script=Cyrillic}\p{Script=Han}]|\(disambiguation\)|\bundefined\b/u.test(text))throw Error('Unexpected native form '+id+' '+text);names.push({lang,language:languages[lang],text,source:b.item.value.replace('http://www.wikidata.org/entity/','https://www.wikidata.org/wiki/'),license:'CC0',provenance:b.snapshot});}return names;
}
function apply(record,names){if(!names.length)return;record.regionalNames=names;record.aliases=[...new Set([...(record.aliases||[]),...names.flatMap(n=>[n.text,...(n.aliases||[])])])];}
const manual=read(path.join(source,'overrides.json'));
const overrides=r=>manual[r.id]||[];
function enrich(country,r){
 const uk=country==='united-kingdom';let code=r.code||r.provenance?.code||r.id.match(/GB-[CDS]-([A-Z]\d{8})$/)?.[1];
 if(uk&&r.level===1)code=({'GB-R-TLL':'W92000004','GB-R-TLM':'S92000003','GB-R-TLN':'N92000002'})[r.id];
 const property=uk?'P836':r.level===1?'P2585':r.level===2?'P2586':'P374';if(!uk)code=r.id.slice(5);
 const native=namesFrom(byCode.get(property+':'+code)||[],uk?ukLanguages(r):frLanguages(r),r.id,r.en);
 if(uk)for(const [lang,value]of Object.entries(r.names||{})){if(!languages[lang]||native.some(n=>n.lang===lang))continue;const text=typeof value==='string'?value:value.name;if(text&&value.type!=='historical language label')native.push({lang,language:languages[lang],text,source:value.source||r.provenance?.gazetteer?.[0]?.source||'https://www.ordnancesurvey.co.uk/products/os-open-names',license:'retained source licence'});}
 // Existing Welsh local-authority names are official retained catalogue forms.
 if(uk&&r.id.startsWith('GB-C-W')&&!native.some(n=>n.lang==='cy')&&r.local?.trim())native.push({lang:'cy',language:'Welsh',text:r.local.trim(),source:'https://www.ons.gov.uk/methodology/geography/geographicalproducts/namescodesandlookups',license:'OGL'});
 const explicit=overrides(r);apply(r,[...native.filter(n=>!explicit.some(e=>e.lang===n.lang)),...explicit]);
}
for(const [country,cat]of Object.entries(cats))for(const r of cat.records)enrich(country,r);
// Gallo entries match a commune within the source's department; theoretical forms are excluded.
const decode=s=>s.replaceAll('&nbsp;',' ').replaceAll('&#039;',"'").replaceAll('&amp;','&').replaceAll('&rsquo;',"'").replace(/<[^>]*>/g,'').trim();
const normalize=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const html=fs.readFileSync(path.join(source,'gallo.html'),'utf8');
for(const section of html.split(/<h2[^>]*>/).slice(1)){
 const dep=/^\s*(22|35|44|56)\s*<\/h2>/.exec(section)?.[1];if(!dep)continue;
 for(const m of section.matchAll(/<strong>(.*?)<\/strong>(.*?)(?=<br|<\/p>)/gs)){
  let french=decode(m[1]).replace(/\s*[:：]\s*$/,'').trim(),variants=decode(m[2]);
  // Only attested commune forms; qualifiers remain part of the retained source, not the UI.
  const native=[...variants.matchAll(/(?:^|,\s*)([^(),:]+)\s*\((nc\.[^)]*)\)/g)].filter(m=>!/(?:\bth\.|\brare\b|\bpéj\.|\bsic\b)/.test(m[2])).map(m=>m[1].trim());
  if(!native.length)continue;
  for(let name of french.split(',').map(s=>s.trim())){
   name=name.replace(/^(.*?)\s*\((la|le|les|l')\)$/i,(_,n,a)=>a+(a==="l'"?'':' ')+n).replace(/\s*\(\d{2}\)$/,'');
   const matches=cats.france.records.filter(r=>r.level===3&&r.parent==='FR-D-'+dep&&normalize(r.local||r.en)===normalize(name));
   if(matches.length!==1)continue;const r=matches[0],names=(r.regionalNames||[]).filter(n=>n.lang!=='fr-x-gallo');names.push({lang:'fr-x-gallo',language:'Gallo',text:native[0],source:'https://www.dugaloenbertegn.bzh/fr/les-noms-de-lieux',license:'Geographical names; Régis Auffray / Le Petit Matao, retained source attribution'});apply(r,names);r.aliases=[...new Set([...r.aliases,...native])];
  }
 }
}
for(const [country,cat]of Object.entries(cats)){
 write('dist/data/europe/'+country+'/catalogue.bin',cat);
 if(country==='united-kingdom'){
  const settlements=read(path.join(root,'dist/data/europe/united-kingdom/settlements.bin'));for(const r of settlements.records)enrich(country,r);
  const belfast=manual['GB-C-N09000003'];for(const r of settlements.records.filter(r=>r.en==='Belfast'))apply(r,[...(r.regionalNames||[]).filter(n=>n.lang!=='sco-x-ulster'),...belfast]);
  write('dist/data/europe/united-kingdom/settlements.bin',settlements);
 }
 // City quizzes are separate catalogues: match exact Wikidata identities, never names alone.
 const cityFile='dist/data/quiz/'+country+'-cities.json',cities=read(path.join(root,cityFile));
 for(const r of cities.records){const bindings=byQid.get(r.wikidata)||[];let allowed;
  if(country==='united-kingdom')allowed=ukLanguages(r);else{const matching=cats.france.records.find(x=>(x.regionalNames||[]).some(n=>n.source==='https://www.wikidata.org/wiki/'+r.wikidata));allowed=matching?frLanguages(matching):[];}
  const names=namesFrom(bindings,allowed,r.id,r.en);if(country==='united-kingdom'&&r.wikidata==='Q10686')names.push(...manual['GB-C-N09000003']);
  apply(r,names);
  const same=cats[country].records.find(x=>x.en===r.en&&x.regionalNames?.length&&Math.hypot(x.center[0]-r.center[0],x.center[1]-r.center[1])<.15);
  if(same){const existing=r.regionalNames||[];apply(r,[...existing,...same.regionalNames.filter(n=>!existing.some(e=>e.lang===n.lang))]);}
 }
 write(cityFile,cities);
 const counts={};for(const r of cat.records)for(const n of r.regionalNames||[])counts[n.language]=(counts[n.language]||0)+1;
 totals[country]={records:cat.records.filter(r=>r.regionalNames?.length).length,names:Object.values(counts).reduce((a,b)=>a+b,0),languages:counts};
 write('dist/data/europe/'+country+'/regional-names.json',{retrieved:'2026-11-07',coverage:'Attested forms only, matched by official codes, with regional language scope filters. No name is inherited from a parent. Coverage varies by language and subdivision. Gallo theoretical forms and conflicting code-label matches are excluded. The Isle of Man retains its Crown Dependency status.',...totals[country],sources:[{title:'Wikidata, CC0; official GSS and INSEE code matching',url:'https://www.wikidata.org/'},...Object.entries(manual).filter(([id])=>id.startsWith(country==='france'?'FR-':'GB-')).flatMap(([,names])=>names).filter((n,i,a)=>a.findIndex(o=>o.source===n.source)===i).map(n=>({title:n.language+' reference',url:n.source})),...(country==='france'?[{title:'Gallo geographical names: Régis Auffray / Le Petit Matao',url:'https://www.dugaloenbertegn.bzh/fr/les-noms-de-lieux'}]:[{title:'OS Open Names and retained national statistical settlement names',url:'https://www.ordnancesurvey.co.uk/products/os-open-names'}])]});
}
write('scripts/name-sources/atlantic/coverage-audit.json',{totals,conflicts});console.log(JSON.stringify({totals,conflicts:conflicts.length},null,2));
