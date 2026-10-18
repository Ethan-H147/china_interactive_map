import fs from 'node:fs';
const dir='artifacts/canada-municipal-research',rows=JSON.parse(fs.readFileSync(dir+'/candidates.json')),commons=JSON.parse(fs.readFileSync(dir+'/commons-metadata.json')),extra=fs.existsSync(dir+'/enwiki-metadata.json')?JSON.parse(fs.readFileSync(dir+'/enwiki-metadata.json')):{};
const plain=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const primary={};
const flags={},audit=[];
for(const r of rows){
 if(r.id==='CA-CSD-2431084'){audit.push({id:r.id,name:r.en,parent:r.parent,status:'not-added',reason:'Visual review: source is a distant streetscape/banner photograph, without suitable flag artwork for a thumbnail',rejected:[]});continue;}
 const ordered=[...new Set([r.candidateFile,...r.additionalFiles||[]].filter(Boolean))],rejected=[];let chosen;
 for(const file of ordered){
  const meta=!commons[file]?.missing&&commons[file]?.url?commons[file]:extra[file];
  if(!meta?.url||meta.missing)continue;
  const description=plain(meta.extmetadata?.ImageDescription?.value),credit=plain(meta.extmetadata?.Credit?.value),text=description+' '+file;
  if(!/flag|banner|drapeau|bandera/i.test(text)){rejected.push({file,reason:'Not documented as flag artwork'});continue;}
  if(/\b(?:unofficial|fictional|fictitious|proposed|proposal|conceptual|redesign concept)\b/i.test(text)){rejected.push({file,reason:'Unofficial, proposed or uncertain design',description});continue;}
  if(/\b(?:seal|logo)\b/i.test(file)&&!/flag/i.test(file)){rejected.push({file,reason:'Seal or logo rather than flag artwork'});continue;}
  const direct=file===r.candidateFile||file===r.candidateFile?.replace(/^File:/i,'');
  if(!direct&&!((file+' '+description+' '+credit).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().includes(r.provinceName.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()))){rejected.push({file,reason:'Alternate filename lacks state-specific identity evidence'});continue;}
  const license=plain(meta.extmetadata?.LicenseShortName?.value);if(!license){rejected.push({file,reason:'Artwork licensing metadata unavailable'});continue;}
  chosen={file,meta,description,direct};break;
 }
 if(!chosen){audit.push({id:r.id,name:r.en,parent:r.parent,status:'not-added',reason:rejected.length?rejected.map(x=>x.reason).join('; '):r.candidateReason||'No sourced municipal flag artwork found',rejected});continue;}
 const {file,meta,description,direct}=chosen,sourceArticle='https://en.wikipedia.org/wiki/'+encodeURIComponent(r.wiki.title.replaceAll(' ','_'));
 flags[r.id]={id:r.id,name:r.en,parent:r.parent,code:r.code,commonsFile:meta.title.replace(/^File:/i,''),source:meta.url,page:meta.descriptionurl,width:meta.width,height:meta.height,commonsSha1:meta.sha1,credit:plain(meta.extmetadata?.Artist?.value)||'See original artwork source',license:meta.extmetadata?.NonFree?.value==='true'?'Copyrighted; Wikipedia fair-use source':plain(meta.extmetadata?.LicenseShortName?.value),...(meta.extmetadata?.LicenseUrl?.value?{licenseUrl:meta.extmetadata.LicenseUrl.value}:{}),repository:meta.repository||'shared',identity:{qid:r.wiki.qid,article:sourceArticle,csduid:r.code,province:r.province,parent:r.parent},evidence:{municipality:sourceArticle,artwork:meta.descriptionurl,description,...(primary[r.id]?{official:primary[r.id]}:{}),match:direct?'Matched municipality infobox or geographic-ID flag property':'State-specific artwork title/description'},retrieved:'2026-10-17'};
 audit.push({id:r.id,name:r.en,parent:r.parent,status:'added',file:flags[r.id].commonsFile,rejected});
}
const output={retrieved:'2026-10-17',populationRanking:'dist/data/europe/canada/municipalities/top500.json',policy:'Identity-matched municipal flag artwork, with source and original licensing retained. Proposed/unofficial designs, seals, logos and unverified ambiguous matches are omitted. Artwork licensing labels describe the source and do not grant additional rights.',flags,audit};
fs.writeFileSync('scripts/canada-municipal-flag-files.json',JSON.stringify(output,null,1)+'\n');
console.log('Reviewed flag assets',Object.keys(flags).length,'of',rows.length);
console.log('Excluded suspicious',audit.filter(r=>r.rejected.some(x=>/Unofficial|Not documented|Seal/.test(x.reason))).map(r=>({name:r.name,parent:r.parent,rejected:r.rejected,status:r.status})));
