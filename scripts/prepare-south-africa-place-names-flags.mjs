import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
const cache=resolve(root,'scripts/statistics-sources/south-africa-names-flags');
await mkdir(cache,{recursive:true});
const refresh=process.argv.includes('--refresh');
const languages={en:{label:'English',native:'English'},af:{label:'Afrikaans',native:'Afrikaans'},zu:{label:'Zulu',native:'isiZulu'},xh:{label:'Xhosa',native:'isiXhosa'},ss:{label:'Swati',native:'siSwati'},st:{label:'Southern Sotho',native:'Sesotho'},tn:{label:'Tswana',native:'Setswana'},ts:{label:'Tsonga',native:'Xitsonga'},ve:{label:'Venda',native:'Tshivenda'},nr:{label:'Southern Ndebele',native:'isiNdebele'},nso:{label:'Northern Sotho',native:'Sepedi'}};
export const normalize=name=>name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cityTitles=['Cape Town','Johannesburg','Pretoria','Durban','Gqeberha','Mbombela','Bloemfontein','Pietermaritzburg','East London, South Africa','Polokwane','Mahikeng','Kimberley, South Africa','Rustenburg','Soweto','George, South Africa','Makhanda, South Africa','Kariega','Klerksdorp','Welkom','Mthatha','Bhisho','Qonce','Komani','Emalahleni','Middelburg, Mpumalanga','Worcester, South Africa','Stellenbosch','Paarl','Oudtshoorn','Mossel Bay','Knysna','Plettenberg Bay','Richards Bay','Newcastle, South Africa','Ladysmith, KwaZulu-Natal','Estcourt','Port Shepstone','Vryheid','Ulundi','Ermelo','Secunda','Standerton','Embalenhle','White River, South Africa','Barberton, South Africa','Malalane','Hazyview','Tzaneen','Makhado','Thohoyandou','Giyani','Musina','Lephalale','Mokopane','Brits','Potchefstroom','Lichtenburg','Vryburg','Upington','Springbok, Northern Cape','De Aar','Kuruman','Bethlehem, South Africa','Sasolburg','Phuthaditjhaba','Harrismith','Botshabelo','Thaba Nchu','Jeffreys Bay','Graaff-Reinet','Aliwal North','Cradock, South Africa','Germiston','Benoni, South Africa','Boksburg','Kempton Park, Gauteng','Centurion, South Africa','Vanderbijlpark','Vereeniging','Krugersdorp','Roodepoort','Midrand','KwaDukuza','KwaMashu','Umlazi','Eastern Cape','Western Cape','Northern Cape','Free State (province)','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West (South African province)'];
async function getJson(url){const r=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (sourced multilingual names)'}});if(!r.ok)throw Error(`HTTP ${r.status}: ${url}`);return r.json();}
const snapshotPath=resolve(cache,'wikidata-labels.json');
let snapshot;try{if(!refresh)snapshot=JSON.parse(await readFile(snapshotPath,'utf8'));}catch{}
if(!snapshot){
 const pages=[];for(let i=0;i<cityTitles.length;i+=40){const j=await getJson('https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',redirects:'1',prop:'pageprops',titles:cityTitles.slice(i,i+40).join('|')}));pages.push(...Object.values(j.query.pages));}
 const ids=pages.map(p=>p.pageprops?.wikibase_item).filter(Boolean),entities={};
 for(let i=0;i<ids.length;i+=40){const j=await getJson('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',props:'labels',languages:Object.keys(languages).join('|'),ids:ids.slice(i,i+40).join('|')}));Object.assign(entities,j.entities);}
 snapshot={retrieved:'2026-10-09',license:'CC0',pages:pages.map(p=>({title:p.title,id:p.pageprops?.wikibase_item})),entities};await writeFile(snapshotPath,JSON.stringify(snapshot,null,2)+'\n');
}
const sources={wikidata:{title:'Wikidata language labels (CC0; linguistic labels, not official designations)',url:'https://www.wikidata.org/wiki/Wikidata:Licensing'},unisa:{title:'University of South Africa: isiZulu place names',url:'https://www.unisa.ac.za/static/corporate_web/Content/UnisaOpen/freeOnlineCourse/Zulu/Zulu6.html'},swatiPretoria:{title:'South African Presidency, siSwati Cabinet statement',url:'https://presidency.gov.za/ssw/node/5417'},mbombela:{title:'City of Mbombela: siSwati name',url:'https://www.mbombela.gov.za/sample-page/'},renames:{title:'Eastern Cape Provincial Geographical Names Committee: approved city names',url:'https://www.ecpgnc.gov.za/nelson-mandela-bay-municipality/'}};
const places={};
for(const page of snapshot.pages){
 if(!page.id)continue;const name=page.title.replace(/, (South Africa|Northern Cape|Mpumalanga|KwaZulu-Natal|Gauteng)$/,'').replace(/ \((province|South African province)\)$/,'');
 const names={};for(const [lang,record] of Object.entries(snapshot.entities[page.id]?.labels||{}))if(lang!=='en'&&record.value!==name&&!/[,()]/.test(record.value))names[lang]={name:record.value,source:`https://www.wikidata.org/wiki/${page.id}`,type:'linguistic label'};
 if(Object.keys(names).length)places[normalize(name)]={name,names,aliases:[],wikidata:page.id};
}
function add(name,lang,value,source,type='attested language name'){const key=normalize(name);places[key]??={name,names:{},aliases:[]};places[key].names[lang]={name:value,source:sources[source].url,type};}
for(const [name,value] of [['Johannesburg','eGoli'],['Cape Town','eKapa'],['Gqeberha','eBhayi'],['Pietermaritzburg','eMgungundlovu'],['Durban','eThekwini']])add(name,'zu',value,'unisa',name==='Gqeberha'?'traditional name (Port Elizabeth)':'attested language name');
add('Pretoria','ss','ePitoli','swatiPretoria');add('Mbombela','ss','Mbombela','mbombela','official name of siSwati origin');
for(const [name,old,source] of [['Gqeberha','Port Elizabeth',sources.renames.url],['Kariega','Uitenhage',sources.renames.url],['Makhanda','Grahamstown','https://www.gov.za/news/media-statements/minister-nathi-mthethwa-announces-renaming-grahamstown-makhanda-02-jul-2018'],['Komani','Queenstown','https://ecprov.gov.za/MediaCenter/NewsDetail/1460'],['Qonce',"King William's Town",'https://www.buffalocity.gov.za/tender_documents.php?type=Formal+Tender&year=2022'],['Mbombela','Nelspruit',sources.mbombela.url]]){const p=places[normalize(name)]??={name,names:{},aliases:[]};p.aliases.push(old);p.renameSource=source;for(const record of Object.values(p.names))if(record.name===old)record.type='historical language label';}
const flagsPath=resolve(cache,'flags.json');
const flags=JSON.parse(await readFile(flagsPath,'utf8'));
for(const [key,flag] of Object.entries(flags)){
 let bytes;const path=resolve(dist,flag.file);try{if(!refresh)bytes=await readFile(path);}catch{}
 if(!bytes){let r;for(let attempt=0;attempt<4;attempt++){r=await fetch(flag.original,{headers:{'User-Agent':'BoundaryAtlas/1.0 (source preservation)'}});if(r.status!==429)break;await new Promise(resolve=>setTimeout(resolve,5000*(attempt+1)));}if(!r.ok)throw Error(`Flag ${key}: HTTP ${r.status}`);bytes=Buffer.from(await r.arrayBuffer());if(flag.file.endsWith('.svg')&&!bytes.toString().includes('<svg'))throw Error('Expected original SVG');await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);}
 const sha256=createHash('sha256').update(bytes).digest('hex');if(flag.sha256&&flag.sha256!==sha256&&!refresh)throw Error(`Flag checksum changed: ${key}`);flag.sha256=sha256;
 places[key]??={name:flag.name,names:{},aliases:[]};places[key].flag={...flag,full:flag.file};
}
await writeFile(flagsPath,JSON.stringify(flags,null,2)+'\n');
// Current metro flags represent the containing municipality, not an invented
// separate settlement flag. Preserve historical city artwork independently.
for(const [metro,cities] of Object.entries({ethekwini:['Durban','Umlazi','KwaMashu','Pinetown','Westville','Amanzimtoti','Umhlanga','Umkomaas'],ekurhuleni:['Benoni','Boksburg','Germiston','Kempton Park','Alberton','Brakpan','Edenvale','Nigel','Daveyton','Tembisa','Modderfontein'],buffalocity:['East London','Bhisho','Qonce','Mdantsane','Zwelitsha'],johannesburg:['Soweto','Roodepoort','Randburg','Sandton','Midrand']})){
 const flag=places[metro].flag;
 for(const name of cities){const key=normalize(name);places[key]??={name,names:{},aliases:[]};if(places[key].flag?.status==='historical')places[key].historicalFlag=places[key].flag;places[key].flag={...flag};}
}
for(const [modern,old] of [['Komani','Queenstown'],['Makhanda','Grahamstown'],['Qonce',"King William's Town"]]){const key=normalize(old);if(places[key]){Object.assign(places[normalize(modern)].names,places[key].names);delete places[key];}}
for(const [key,aliases] of Object.entries({mafikeng:['Mahikeng'],witbank:['Emalahleni'],nxuba:['Cradock'],botshabelofreestate:['Botshabelo'],thabanchu:['Thaba Nchu']}))if(places[key])places[key].aliases.push(...aliases);
for(const [key,p] of Object.entries(places)){
 p.aliases=[...new Set(p.aliases)];
 for(const n of Object.values(p.names))if(p.aliases.includes(n.name))n.type='historical language label';
 if(!Object.keys(p.names).length&&!p.flag&&!p.aliases.length)delete places[key];
}
const out={retrieved:'2026-10-09',languages,places,sources};
await writeFile(resolve(dist,'data/southern-africa/south-africa/place-names-flags.json'),JSON.stringify(out)+'\n');
console.log(`Prepared ${Object.keys(places).length} multilingual/flag records, ${Object.values(places).reduce((n,p)=>n+Object.keys(p.names).length,0)} sourced language labels, ${Object.keys(flags).length} original flags.`);
