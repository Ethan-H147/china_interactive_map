// Region and department flags for France, community and province flags for Spain.
// Choices follow the retained Wikipedia lists in scripts/statistics-sources/europe/flags/:
//  France: "Flags of the regions of France" (en, revision in the manifest). Regions show
//   the traditional flag in use where one exists, otherwise the regional council's logo
//   flag; departments show the departmental council's flag, and none where the council has
//   none (proposed banners of arms are not shown).
//  Spain: "Anexo:Banderas de España" (es). Communities and autonomous cities show their
//   statutory flag; provinces their official provincial flag, and none where the list
//   records "Without official flag". A single-province community shows its flag once.
// Municipal and commune flags are not included.
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
const spainCommunities=[['01','Flag of Andalucía.svg'],['02','Flag of Aragon.svg'],['03','Flag of Asturias.svg'],['04','Flag of the Balearic Islands.svg'],['05','Flag of the Canary Islands.svg'],['06','Flag of Cantabria (Official).svg'],['07','Flag of Castile and León.svg'],['08','Flag of Castile-La Mancha.svg'],['09','Flag of Catalonia.svg'],['10','Bandera de la Comunidad Valenciana (2x3).svg'],['11','Flag of Extremadura with COA.svg'],['12','Flag of Galicia.svg'],['13','Flag of the Community of Madrid.svg'],['14','Flag of the Region of Murcia.svg'],['15','Bandera de Navarra.svg'],['16','Flag of the Basque Country.svg'],['17','Flag of La Rioja (with coat of arms).svg'],['18','Flag Ceuta.svg'],['19','Flag of Melilla.svg']];

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

const [france,spain]=[await catalogue('france'),await catalogue('spain')];
const selections={
 france:{first:franceRegions.map(([code,file,status])=>['FR-R-'+code,file,status]),detail:await franceDepartments(france)},
 spain:{first:spainCommunities.map(([code,file])=>['ES-A-'+code,file,code>'17'?'Official flag of the autonomous city':'Official flag (Statute of Autonomy)']),detail:await spainProvinces(spain)}
};
// A province that is its community's only province shows the community flag once.
const childCount=records=>records.reduce((m,r)=>(r.parent&&m.set(r.parent,(m.get(r.parent)||0)+1),m),new Map());
for(const [country,records] of [['france',france],['spain',spain]]){
 const index=new Map(records.map(r=>[r.id,r])),counts=childCount(records.filter(r=>r.level===2));
 selections[country].detail=selections[country].detail.filter(([id])=>counts.get(index.get(id).parent)>1);
 for(const [id] of [...selections[country].first,...selections[country].detail])if(!index.has(id))throw Error('Flag without boundary: '+id);
}

// Commons metadata for every chosen file (license, author, original URL).
const files=[...new Set(Object.values(selections).flatMap(s=>[...s.first,...s.detail].map(([,file])=>file)))];
const info=new Map();
for(let i=0;i<files.length;i+=40){
 const url='https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size|extmetadata|sha1&titles='+encodeURIComponent(files.slice(i,i+40).map(f=>'File:'+f).join('|'));
 const json=await (await fetch(url,{headers:agent})).json();
 const normalized=new Map((json.query.normalized||[]).map(n=>[n.to,n.from]));
 for(const page of json.query.pages){
  const name=(normalized.get(page.title)||page.title).replace(/^File:/,'');
  if(page.missing||!page.imageinfo)throw Error('Missing on Commons: '+name);
  info.set(name.replace(/_/g,' '),page.imageinfo[0]);
 }
}
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
const manifest={retrieved:new Date().toISOString().slice(0,10),sources:{france:'https://en.wikipedia.org/wiki/Flags_of_the_regions_of_France',spain:'https://es.wikipedia.org/wiki/Anexo:Banderas_de_Espa%C3%B1a'},flags:{}};
const out={};
const cache=resolve(root,'scripts/additional-sources/europe-flags');
await mkdir(cache,{recursive:true});await rm(resolve(dist,'vendor/europe-flags'),{recursive:true,force:true});await mkdir(resolve(dist,'vendor/europe-flags'),{recursive:true});
for(const [country,{first,detail}] of Object.entries(selections)){
 const index=new Map((country==='france'?france:spain).map(r=>[r.id,r]));
 out[country]={firstFlags:{},detailFlags:{}};
 for(const [level,list] of [['firstFlags',first],['detailFlags',detail]])for(const [id,file,status] of list){
  const meta=info.get(file.replace(/_/g,' '));if(!meta)throw Error('No Commons metadata: '+file);
  // Originals are cached outside dist/ (not committed) and reused while Commons is unchanged.
  let bytes;const cachePath=resolve(cache,id+'.svg');
  if(!refresh){try{const kept=await readFile(cachePath);if(createHash('sha1').update(kept).digest('hex')===meta.sha1)bytes=kept;}catch{}}
  if(!bytes)bytes=await download(meta.url,id);
  if(createHash('sha1').update(bytes).digest('hex')!==meta.sha1)throw Error(`${id}: download differs from Commons`);
  if(!bytes.toString('utf8',0,4000).includes('<svg'))throw Error(`${id}: original is not SVG`);
  await writeFile(cachePath,bytes);
  // Small originals ship as they are. Large heraldic SVGs (some are several megabytes) ship as
  // a sharp raster for the sidebar and a 1600-pixel raster for the enlarged view; the Commons
  // original stays linked.
  let shown=`vendor/europe-flags/${id}.svg`,full=shown;
  if(bytes.length<=120000)await writeFile(resolve(dist,shown),bytes);
  else{
   shown=`vendor/europe-flags/${id}.webp`;await sharp(bytes,{density:300}).resize({height:240}).webp({quality:90}).toFile(resolve(dist,shown));
   if(bytes.length<=400000){full=`vendor/europe-flags/${id}.svg`;await writeFile(resolve(dist,full),bytes);}
   else{full=`vendor/europe-flags/${id}-large.webp`;await sharp(bytes,{density:300}).resize({width:1600,withoutEnlargement:false}).webp({quality:90}).toFile(resolve(dist,full));}
  }
  const m=meta.extmetadata||{},license=plain(m.LicenseShortName?.value)||'See Commons page',artist=plain(m.Artist?.value);
  const flag={file:shown,full,width:meta.width,height:meta.height,name:index.get(id).en,status,
   page:meta.descriptionurl,source:meta.url,credit:status+' · '+(artist||'Wikimedia Commons'),license,...(m.LicenseUrl?.value?{licenseUrl:m.LicenseUrl.value}:{}),commonsSha1:meta.sha1,sha256:createHash('sha256').update(bytes).digest('hex')};
  out[country][level][id]=flag;manifest.flags[id]={country,level:level==='firstFlags'?1:2,commonsFile:file,...flag};
 }
 console.log(country,Object.keys(out[country].firstFlags).length,'first-level and',Object.keys(out[country].detailFlags).length,'second-level flags');
}
await writeFile(manifestPath,JSON.stringify(manifest,null,1)+'\n');
const strip=flag=>{const {commonsSha1,sha256,status,...rest}=flag;return rest;};
const module=Object.fromEntries(Object.entries(out).map(([c,v])=>[c,{firstFlags:Object.fromEntries(Object.entries(v.firstFlags).map(([k,f])=>[k,strip(f)])),detailFlags:Object.fromEntries(Object.entries(v.detailFlags).map(([k,f])=>[k,strip(f)]))}]));
await writeFile(resolve(dist,'europe-flags.mjs'),'// Region, community, department and province flags; sources, status and licenses in data/europe/subdivision-flag-sources.json.\nexport const europeFlags='+JSON.stringify(module)+';\n');
