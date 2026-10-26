import fs from 'node:fs';import {gzipSync,gunzipSync} from 'node:zlib';
import {profiles,languageLabels,generalSources,coverageSources,attested} from './india-language-profiles.mjs';
const dir='scripts/name-sources/india';
export function prepareIndiaNames(root='dist/data/europe/india/'){
 const snapshot=JSON.parse(fs.readFileSync(dir+'/wikidata.json','utf8')),identity=JSON.parse(fs.readFileSync(dir+'/identity.json','utf8')),entities=snapshot.entities,cat=JSON.parse(gunzipSync(fs.readFileSync(root+'catalogue.bin'))),records={},audit=[];
 for(const r of cat.records.filter(r=>r.level===1)){
  const [primary,regional]=profiles[r.code]||[];if(!primary)throw Error('Missing regional profile '+r.id);
  const title=r.en==='Punjab'?'Punjab, India':r.en==='Puducherry'?'Puducherry (union territory)':r.en==='Jammu and Kashmir'?'Jammu and Kashmir (union territory)':r.en,qid=identity.query.pages.find(p=>p.title===title)?.pageprops?.wikibase_item,entity=entities[qid];if(!entity)throw Error('Missing exact state identity '+r.id);
  const languages=[...new Set([primary,...regional.split(' ')])],names=[],missing=[];
  for(const code of languages){
   const override=attested[r.code]?.[code],label=code==='gom'?entity.labels['gom-deva']||entity.claims.P1705?.map(s=>s.mainsnak.datavalue?.value).find(v=>v?.language==='gom'):code==='gbm'?entity.claims.P1705?.map(s=>s.mainsnak.datavalue?.value).find(v=>v?.language==='gbm'):entity.labels[code];
   const text=override?.text||label?.value||label?.text;
   if(!text){missing.push({code,language:languageLabels[code],sources:coverageSources[r.code]||[generalSources[0].url,generalSources[1].url]});continue;}
   if(/सम्पादन|\bedit\b|\(disambiguation\)/i.test(text))throw Error('Unreviewed label '+r.id+' '+code);
   names.push({code,text,lang:override?.lang||code,language:languageLabels[code],dir:['ur','ks','sd','dv'].includes(code)?'rtl':'ltr',source:override?.source||'https://www.wikidata.org/wiki/'+qid,type:override?.type||'attested language label',...(override?.romanized?{romanized:true}:{}),license:override?'source text attribution':'CC0',primary:code===primary});
  }
  const main=names.find(n=>n.primary);if(!main)throw Error('Missing primary name '+r.id+' '+primary);
  records[r.id]={wikidata:qid,primary:main,names,otherLanguages:missing,coverageSources:coverageSources[r.code]||[generalSources[0].url,generalSources[1].url]};
  r.aliases=[...new Set([...(r.aliases||[]),r.local,...names.map(n=>n.text)].filter(Boolean))];r.local=main.text;r.localLang=main.lang;r.localLanguage=main.language;r.localDir=main.dir;r.regionalNames=names.filter(n=>n.code!=='en'&&(!n.primary||n.text===r.en));r.otherLanguages=missing;
  audit.push({id:r.id,en:r.en,primary:main.language,names:names.length,otherLanguages:missing.length});
 }
 if(cat.records.filter(r=>r.level===1).length!==36)throw Error('India coverage changed');
 const data={retrieved:snapshot.retrieved,coverage:'All 28 Indian states and eight union territories. Selected established regional and Indigenous language communities; very small groups and a census-wide migrant-language inventory are outside scope. Attested state-name forms are distinguished from language-presence entries. Romanized traditional forms are explicitly marked. This is not an official-language register or a claim of exhaustive dialect coverage.',sources:generalSources,records};
 fs.writeFileSync(root+'catalogue.bin',gzipSync(JSON.stringify(cat),{level:9}));fs.writeFileSync(root+'regional-names.json',JSON.stringify(data,null,2)+'\n');fs.writeFileSync(dir+'/coverage-audit.json',JSON.stringify(audit,null,2)+'\n');
 console.log('India regional names:',audit.length,'states/UTs;',Object.values(records).reduce((s,r)=>s+r.names.length,0),'attested forms;',Object.values(records).reduce((s,r)=>s+r.otherLanguages.length,0),'language-presence entries.');
 return data;
}
if(process.argv[1]?.endsWith('prepare-india-names.mjs'))prepareIndiaNames();
