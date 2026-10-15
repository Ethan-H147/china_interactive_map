// Subdivision flags for the European countries, at most two levels below the national flag.
// Choices follow the retained Wikipedia lists in scripts/statistics-sources/europe/flags/:
//  France: "Flags of the regions of France" (en, revision in the manifest). Regions show
//   the traditional flag in use where one exists, otherwise the regional council's logo
//   flag; departments show the departmental council's flag, and none where the council has
//   none (proposed banners of arms are not shown).
//  Spain: "Anexo:Banderas de España" (es). Communities and autonomous cities show their
//   statutory flag; provinces their official provincial flag, and none where the list
//   records "Without official flag". A single-province community shows its flag once.
//  Italy: regions show their flag adopted by regional law ("List of Italian flags", en);
//   provinces show their flag only where "Armoriale delle province italiane" (it) records its
//   blazon in the grant, not where it only shows an image. Former provinces kept as statistical
//   units are not shown.
//  United Kingdom: Scotland and Wales show their national flags and the English regions
//   England's; Northern Ireland has had no official flag since 1973 and shows none. County and
//   council flags are not shown: the well-known county flags are community flags registered
//   with the Flag Institute, not adopted by the councils.
//  Overseas France: each territory's official or co-official flag, otherwise the flag its local
//   government uses ("Flags of Overseas France" in the same French list); Réunion and
//   Saint-Martin have neither. The UK's overseas territories and Crown Dependencies show their
//   official flags; Saint Helena, Ascension and Tristan da Cunha each have their own, the
//   territory as a whole none, and the Sovereign Base Areas fly the Union Flag only.
// Unofficial flags and municipal and commune flags are not included.
// Usage: node scripts/fetch-europe-subdivision-flags.mjs [--refresh]
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist'),sources=resolve(root,'scripts/statistics-sources/europe/flags');
const manifestPath=resolve(dist,'data/europe/subdivision-flag-sources.json');
let previous;try{previous=JSON.parse(await readFile(manifestPath,'utf8'));}catch{previous={flags:{}};}
const refresh=process.argv.includes('--refresh'),agent={'User-Agent':'BoundaryAtlas/1.0 (https://github.com/Ethan-H147/china_interactive_map; flag source preservation)'};
const catalogue=async country=>JSON.parse(gunzipSync(await readFile(resolve(dist,`data/europe/${country}/catalogue.bin`)))).records;
const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');

const TRADITIONAL='Traditional flag',REGION_LOGO='Regional council flag (logo flag)',DEPARTMENT='Departmental council flag (logo flag)';
// France, regions: [INSEE code, Commons file, status].
const franceRegions=[
 ['84','Flag of the region Auvergne-Rhône-Alpes.svg',TRADITIONAL],
 ['27','Flag of the region Bourgogne-Franche-Comté (fixed).svg',TRADITIONAL],
 ['53','Flag of Brittany (Gwenn ha du).svg',TRADITIONAL],
 ['24','Flag of Centre-Val de Loire.svg',TRADITIONAL],
 ['94','Flag of Corsica.svg','Official flag of the Collectivity of Corsica'],
 ['44','Flag of Grand Est (2022-present).svg',REGION_LOGO],
 ['32','Flag of the Region of Hauts-de-France.svg',REGION_LOGO],
 ['11','Cultural flag of Île-de-France.svg',TRADITIONAL],
 ['28','Flag of Normandie.svg',TRADITIONAL],
 ['75','Flag of Nouvelle-Aquitaine.svg','Regional flag (registered with the French Society of Vexillology)'],
 ['76','Flag of Occitanie.svg',TRADITIONAL],
 // The list's "traditional" entry for Pays de la Loire is a modern unofficial design.
 ['52','Flag of Pays de la Loire.svg',REGION_LOGO],
 ['93','Flag of Provence-Alpes-Côte d\'Azur.svg',TRADITIONAL]
];
// Spain, communities and autonomous cities: [INE code, Commons file].
const OFFICIAL='Official flag',GOVERNMENT='Flag of the local government';
const franceOverseas=[['FR-R-01','Flag of Guadeloupe (Local).svg',GOVERNMENT],['FR-R-02','Flag-of-Martinique.svg',OFFICIAL],['FR-R-03','Flag of French Guiana (Local).svg',GOVERNMENT],['FR-R-06','Flag of Mayotte (Local).svg',GOVERNMENT],['FR-R-975','Flag of Saint-Pierre and Miquelon.svg',GOVERNMENT],['FR-R-977','Flag of Saint Barthélemy (Local).svg',GOVERNMENT],['FR-R-986','Flag of Wallis and Futuna.svg',GOVERNMENT],['FR-R-987','Flag of French Polynesia.svg',OFFICIAL],['FR-R-988','Flag of FLNKS.svg','Co-official flag (flown with the French flag)'],['FR-R-984','Flag of the French Southern and Antarctic Lands.svg',OFFICIAL]];
const ukOverseas=[['GB-O-AI','Flag of Anguilla.svg'],['GB-O-BM','Flag of Bermuda.svg'],['GB-O-IO','Flag of the British Indian Ocean Territory.svg'],['GB-O-VG','Flag of the British Virgin Islands.svg'],['GB-O-KY','Flag of the Cayman Islands.svg'],['GB-O-FK','Flag of the Falkland Islands.svg'],['GB-O-GI','Flag of Gibraltar.svg'],['GB-O-MS','Flag of Montserrat.svg'],['GB-O-PN','Flag of the Pitcairn Islands.svg'],['GB-O-GS','Flag of South Georgia and the South Sandwich Islands.svg'],['GB-O-TC','Flag of the Turks and Caicos Islands.svg'],['GB-X-JE','Flag of Jersey.svg'],['GB-X-IM','Flag of the Isle of Man.svg'],['GB-X-GG','Flag of Guernsey.svg']].map(([id,file])=>[id,file,OFFICIAL]);
const ukOverseasParts=[['GB-O-SH-HL','Flag of Saint Helena.svg'],['GB-O-SH-AC','Flag of Ascension Island.svg'],['GB-O-SH-TA','Flag of Tristan da Cunha.svg'],['GB-X-GG-A','Flag of Alderney.svg'],['GB-X-GG-S','Flag of Sark.svg']].map(([id,file])=>[id,file,OFFICIAL]);
const spainCommunities=[['01','Flag of Andalucía.svg'],['02','Flag of Aragon.svg'],['03','Flag of Asturias.svg'],['04','Flag of the Balearic Islands.svg'],['05','Flag of the Canary Islands.svg'],['06','Flag of Cantabria (Official).svg'],['07','Flag of Castile and León.svg'],['08','Flag of Castile-La Mancha.svg'],['09','Flag of Catalonia.svg'],['10','Bandera de la Comunidad Valenciana (2x3).svg'],['11','Flag of Extremadura with COA.svg'],['12','Flag of Galicia.svg'],['13','Flag of the Community of Madrid.svg'],['14','Flag of the Region of Murcia.svg'],['15','Bandera de Navarra.svg'],['16','Flag of the Basque Country.svg'],['17','Flag of La Rioja (with coat of arms).svg'],['18','Flag Ceuta.svg'],['19','Flag of Melilla.svg']];

// Italy, regions: the "Official regional flags" tables of the retained English list.
async function italyRegions(records){
 const text=await readFile(resolve(sources,'en-List_of_Italian_flags.wikitext'),'utf8');
 const section=text.slice(text.indexOf('=== Official regional flags ==='),text.indexOf('==== Historical regional flags ===='));
 const aliases={trentinoaltoadigesudtirol:'trentinosouthtyrol'},byName=new Map(records.filter(r=>r.level===1).map(r=>[fold(r.en),r]));
 const chosen=[];
 for(const row of section.split('\n|-')){
  const file=/File:([^|\]]+)/.exec(row)?.[1].trim(),region=/\]\] \[\[([^\]|]+)/.exec(row)?.[1];if(!file||!region)continue;
  const record=byName.get(aliases[fold(region)]||fold(region));if(!record)throw Error('Region not in the boundaries: '+region);
  chosen.push([record.id,file,'Official regional flag']);
 }
 return chosen;
}
// Italy, provinces: a flag only where the armorial records the flag's blazon among the grants.
async function italyProvinces(records){
 const text=await readFile(resolve(sources,'it-Armoriale_delle_province_italiane.wikitext'),'utf8');
 const start=text.indexOf('== Divisioni amministrative esistenti =='),rows=text.slice(start,text.indexOf('\n==',start+10)).split(/\n\|- valign=top\n/).slice(1);
 const byName=new Map();for(const r of records.filter(r=>r.level===2))for(const n of [r.en,...String(r.local).split('/')])byName.set(fold(n),r);
 const chosen=[],missing=[];
 for(const row of rows){
  const name=/'''\[\[([^\]|]+)/.exec(row)[1],file=/File:([^|\]]+)/.exec(row.split(/\n\|(?!-)/).at(-1))?.[1].trim();
  if(!file||/No image/.test(file)||!/(?:;\s*Bandiera|Bandiera\s*:)[\s\S]{0,80}?Drappo/.test(row))continue;
  const key=name.replace(/^(Provincia autonoma di |Provincia di |Provincia della |Provincia dell'|Provincia del |Città metropolitana di |Libero consorzio comunale di )/,'');
  const record=byName.get(fold(key));if(!record){missing.push(name);continue;}
  if(/^Statistical unit/.test(record.kind))continue;
  // Milan's image is the de facto flag; the armorial gives a different de iure flag.
  if(/(?:;\s*Bandiera|Bandiera\s*:)\s*\*\s*de facto/.test(row))continue;
  chosen.push([record.id,file,'Official provincial flag']);
 }
 if(missing.length)throw Error('Provinces not in the boundaries: '+missing.join(', '));
 return chosen;
}
// France, departments: the council flag column of the retained article's department table.
async function franceDepartments(records){
 const text=await readFile(resolve(sources,'en-Flags_of_the_regions_of_France.wikitext'),'utf8');
 const section=text.slice(text.indexOf('== French Departments =='));
 const cells=section.slice(0,section.indexOf('\n==',5)>0?section.indexOf('\n==',5):undefined).split('\n').filter(l=>l.startsWith('|')&&!/^\|[-}]/.test(l)).map(l=>l.slice(1).trim());
 const byName=new Map(records.filter(r=>r.level===2).map(r=>[fold(r.en),r]));
 const chosen=[],missing=[];
 for(let i=0;i<cells.length;i++){
  const m=/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/.exec(cells[i]);if(!m||/^File:/.test(m[1]))continue;
  const name=(m[2]||m[1]).replace(/ \(department\)$/,'').trim(),record=byName.get(fold(name));
  const file=/File:([^|\]]+)/.exec(cells[i+1]||'')?.[1].trim();
  if(!record){if(name!=='Grand Lyon')missing.push(name);continue;}
  if(file&&!/^No[ _]flag\.svg$/.test(file))chosen.push([record.id,file,DEPARTMENT]);
 }
 if(missing.length)throw Error('Departments not in the boundaries: '+missing.join(', '));
 return chosen;
}
// Spain, provinces: the gallery in the retained article's "Provincias" section.
async function spainProvinces(records){
 const text=await readFile(resolve(sources,'es-Anexo_Banderas_de_Espa_a.wikitext'),'utf8');
 const section=text.slice(text.indexOf('== Provincias =='),text.indexOf('== Islas =='));
 const aliases={orense:'ourense','lacoruna':'acoruna',gerona:'girona',lerida:'lleida',guipuzcoa:'gipuzkoa',vizcaya:'biscay',sevilla:'seville',navarra:'navarre',baleares:'balearicislands','laregiondemurcia':'murcia',alava:'alava'};
 const provinces=records.filter(r=>r.level===2),byName=new Map();
 for(const r of provinces)for(const n of [r.en,...String(r.local).split('/')])byName.set(fold(n),r);
 const chosen=[],missing=[];
 for(const line of section.split('\n')){
  const m=/^Archivo:([^|]+)\|(.*)$/.exec(line.trim());if(!m)continue;
  const label=[...m[2].matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].map(x=>(x[2]||x[1]).replace(/^Bandera (de la |del |de )?/,'').replace(/^(Provincia de |provincia de )/,'').replace(/ \(.*\)$/,'').trim()).filter(x=>x!=='Bandera').at(-1);
  const key=fold(label),record=byName.get(aliases[key]||key);
  if(!record){missing.push(label);continue;}
  if(!/Without official flag/.test(m[1]))chosen.push([record.id,m[1].trim(),'Official provincial flag']);
 }
 if(missing.length)throw Error('Provinces not in the boundaries: '+missing.join(', '));
 return chosen;
}

const records={france:await catalogue('france'),spain:await catalogue('spain'),italy:await catalogue('italy'),'united-kingdom':await catalogue('united-kingdom')};
const {france,spain}=records;
// United Kingdom: [region code, Commons file, status, name shown].
const england=['TLC','TLD','TLE','TLF','TLG','TLH','TLI','TLJ','TLK'].map(code=>['GB-R-'+code,'Flag of England.svg','National flag of England','England']);
const selections={
 france:{first:[...franceRegions.map(([code,file,status])=>['FR-R-'+code,file,status]),...franceOverseas],detail:await franceDepartments(france)},
 spain:{first:spainCommunities.map(([code,file])=>['ES-A-'+code,file,code>'17'?'Official flag of the autonomous city':'Official flag (Statute of Autonomy)']),detail:await spainProvinces(spain)},
 italy:{first:await italyRegions(records.italy),detail:await italyProvinces(records.italy)},
 'united-kingdom':{first:[['GB-R-TLM','Flag of Scotland.svg','National flag of Scotland','Scotland'],['GB-R-TLL','Flag of Wales.svg','National flag of Wales','Wales'],...england,...ukOverseas],detail:ukOverseasParts}
};
// A province that is its community's only province shows the community flag once.
const childCount=records=>records.reduce((m,r)=>(r.parent&&m.set(r.parent,(m.get(r.parent)||0)+1),m),new Map());
for(const [country,list] of Object.entries(records)){
 const index=new Map(list.map(r=>[r.id,r])),counts=childCount(list.filter(r=>r.level===2));
 selections[country].detail=selections[country].detail.filter(([id])=>counts.get(index.get(id).parent)>1);
 for(const [id] of [...selections[country].first,...selections[country].detail])if(!index.has(id))throw Error('Flag without boundary: '+id);
}

// Commons metadata for every chosen file (license, author, original URL).
const files=[...new Set(Object.values(selections).flatMap(s=>[...s.first,...s.detail].map(([,file])=>file)))];
const info=new Map(),notOnCommons=[];
for(let i=0;i<files.length;i+=40){
 const url='https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size|extmetadata|sha1&titles='+encodeURIComponent(files.slice(i,i+40).map(f=>'File:'+f).join('|'));
 const json=await (await fetch(url,{headers:agent})).json();
 const normalized=new Map((json.query.normalized||[]).map(n=>[n.to,n.from]));
 for(const page of json.query.pages){
  const name=(normalized.get(page.title)||page.title).replace(/^File:/,'');
  // A file hosted only on a local Wikipedia carries no Commons license record; it is left out.
  if(page.missing||!page.imageinfo){notOnCommons.push(name);continue;}
  info.set(name.replace(/_/g,' '),page.imageinfo[0]);
 }
}
for(const selection of Object.values(selections))for(const key of ['first','detail'])selection[key]=selection[key].filter(([,file])=>info.has(file.replace(/_/g,' ')));
if(notOnCommons.length)console.log('Not on Commons, left out:',notOnCommons.join('; '));
// Commons limits request rates: pace downloads and honour Retry-After.
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function download(url,id){
 for(let attempt=0;attempt<6;attempt++){
  await pause(1200);
  const r=await fetch(url,{headers:agent,signal:AbortSignal.timeout(60000)}).catch(error=>({ok:false,status:599,headers:new Headers(),error}));
  if(r.ok)return Buffer.from(await r.arrayBuffer());
  if(r.status!==429&&r.status<500)throw Error(`${id}: HTTP ${r.status}`);
  const wait=Math.min(120,Number(r.headers.get('retry-after'))||15*(attempt+1));console.log(`${id}: HTTP ${r.status}, retrying in ${wait} s`);
  await pause(wait*1000);
 }
 throw Error(`${id}: Commons kept refusing the download`);
}
const plain=html=>String(html||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const manifest={retrieved:new Date().toISOString().slice(0,10),sources:{france:'https://en.wikipedia.org/wiki/Flags_of_the_regions_of_France',spain:'https://es.wikipedia.org/wiki/Anexo:Banderas_de_Espa%C3%B1a',italy:['https://en.wikipedia.org/wiki/List_of_Italian_flags','https://it.wikipedia.org/wiki/Armoriale_delle_province_italiane'],'united-kingdom':'https://en.wikipedia.org/wiki/List_of_flags_of_the_United_Kingdom'},flags:{}};
const out={};
const cache=resolve(root,'scripts/additional-sources/europe-flags');
await mkdir(cache,{recursive:true});await rm(resolve(dist,'vendor/europe-flags'),{recursive:true,force:true});await mkdir(resolve(dist,'vendor/europe-flags'),{recursive:true});
for(const [country,{first,detail}] of Object.entries(selections)){
 const index=new Map(records[country].map(r=>[r.id,r]));
 out[country]={firstFlags:{},detailFlags:{}};
 for(const [level,list] of [['firstFlags',first],['detailFlags',detail]])for(const [id,file,status,shownName] of list){
  const meta=info.get(file.replace(/_/g,' '));if(!meta)throw Error('No Commons metadata: '+file);
  // Originals are cached outside dist/ (not committed) and reused while Commons is unchanged.
  const raster=/\.(png|jpe?g)$/i.exec(file)?.[1].toLowerCase();
  let bytes;const cachePath=resolve(cache,meta.sha1+'.'+(raster||'svg'));
  if(!refresh){try{const kept=await readFile(cachePath);if(createHash('sha1').update(kept).digest('hex')===meta.sha1)bytes=kept;}catch{}}
  if(!bytes)bytes=await download(meta.url,id);
  if(createHash('sha1').update(bytes).digest('hex')!==meta.sha1)throw Error(`${id}: download differs from Commons`);
  if(!raster&&!bytes.toString('utf8',0,4000).includes('<svg'))throw Error(`${id}: original is not SVG`);
  await writeFile(cachePath,bytes);
  // Small originals ship as they are. Large heraldic SVGs (some are several megabytes) ship as
  // a sharp raster for the sidebar and a 1600-pixel raster for the enlarged view; the Commons
  // original stays linked.
  // Render vector art at about 1800 pixels wide, whatever size the SVG declares.
  const density=Math.max(1,Math.min(300,72*1800/(meta.width||1800)));
  let shown=`vendor/europe-flags/${id}.svg`,full=shown;
  if(raster){shown=`vendor/europe-flags/${id}.webp`;full=`vendor/europe-flags/${id}-large.webp`;await sharp(bytes).resize({height:240}).webp({quality:90}).toFile(resolve(dist,shown));await sharp(bytes).resize({width:1600,withoutEnlargement:true}).webp({quality:92}).toFile(resolve(dist,full));}
  else if(bytes.length<=120000)await writeFile(resolve(dist,shown),bytes);
  else{
   shown=`vendor/europe-flags/${id}.webp`;await sharp(bytes,{density}).resize({height:240}).webp({quality:90}).toFile(resolve(dist,shown));
   if(bytes.length<=400000){full=`vendor/europe-flags/${id}.svg`;await writeFile(resolve(dist,full),bytes);}
   else{full=`vendor/europe-flags/${id}-large.webp`;await sharp(bytes,{density}).resize({width:1600,withoutEnlargement:false}).webp({quality:90}).toFile(resolve(dist,full));}
  }
  const m=meta.extmetadata||{},license=plain(m.LicenseShortName?.value)||'See Commons page',artist=plain(m.Artist?.value);
  const flag={file:shown,full,width:meta.width,height:meta.height,name:shownName||index.get(id).en,status,
   page:meta.descriptionurl,source:meta.url,credit:status+' · '+(artist||'Wikimedia Commons'),license,...(m.LicenseUrl?.value?{licenseUrl:m.LicenseUrl.value}:{}),commonsSha1:meta.sha1,sha256:createHash('sha256').update(bytes).digest('hex')};
  out[country][level][id]=flag;manifest.flags[id]={country,level:level==='firstFlags'?1:2,commonsFile:file,...flag};
 }
 console.log(country,Object.keys(out[country].firstFlags).length,'first-level and',Object.keys(out[country].detailFlags).length,'second-level flags');
}
await writeFile(manifestPath,JSON.stringify(manifest,null,1)+'\n');
const strip=flag=>{const {commonsSha1,sha256,status,...rest}=flag;return rest;};
const module=Object.fromEntries(Object.entries(out).map(([c,v])=>[c,{firstFlags:Object.fromEntries(Object.entries(v.firstFlags).map(([k,f])=>[k,strip(f)])),detailFlags:Object.fromEntries(Object.entries(v.detailFlags).map(([k,f])=>[k,strip(f)]))}]));
await writeFile(resolve(dist,'europe-flags.mjs'),'// Region, community, department and province flags; sources, status and licenses in data/europe/subdivision-flag-sources.json.\nexport const europeFlags='+JSON.stringify(module)+';\n');
