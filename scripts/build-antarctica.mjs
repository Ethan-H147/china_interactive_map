import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
const root='dist/data/antarctica/',source='scripts/boundary-sources/antarctica/';
fs.mkdirSync(root,{recursive:true});
const manifest=load(source+'manifest.json'),bytes=gunzipSync(fs.readFileSync(source+'facilities-nov2024.csv.gz'));
if(createHash('sha256').update(bytes).digest('hex')!==manifest.files['facilities-nov2024.csv'].sha256)throw Error('Station source hash');
function csv(text){const rows=[];let row=[],cell='',quote=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(!quote&&(ch===','||ch==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(ch==='\n'){rows.push(row);row=[];}}else cell+=ch;}if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}const headers=rows.shift();return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));}
const facilities=csv(new TextDecoder('windows-1252').decode(bytes)).filter(r=>Number(r['Latitude (DD)'])<=-60).map(r=>{
 const center=[Number(r['Longitude (DD)']),Number(r['Latitude (DD)'])];
 if(!r['Record ID#']||!r['English Name']||!center.every(Number.isFinite)||center[1]>-60||center[1]<-90)throw Error('Invalid COMNAP record '+JSON.stringify(r));
 const en=r['English Name'].trim().replace(/\bAntartic\b/gi,'Antarctic'),local=r['Official Name'].trim();
 return {id:'AQ-COMNAP-'+r['Record ID#'],en,local,center,level:1,kind:r.Type||'Research facility',operators:[...new Set([r['Operator (primary)'],r['Operator (additional)']].filter(Boolean))],season:r.Seasonality,status:r.Status,established:Number(r['Year Established'])||null,elevation:r['Elevation (meters)']?Number(r['Elevation (meters)']):null,peakPopulation:Number(r['Peak Population'])||null,aliases:[local,r['English Name'].trim(),...(en.includes('Amundsen')?['South Pole','Amundsen Scott','Amundsen-Scott South Pole Station']:[])].filter(Boolean),sourceEdition:manifest.edition};
}).sort((a,b)=>a.en.localeCompare(b.en));
const antarctica=load('scripts/boundary-sources/nordics/ne-countries.json.gz').features.filter(f=>f.properties.ADM0_A3==='ATA').map(f=>({...f,properties:{country:'antarctica'}}));
if(!antarctica.length)throw Error('Natural Earth Antarctica missing');
fs.writeFileSync(root+'context.bin',gzipSync(JSON.stringify({type:'FeatureCollection',features:antarctica}),{level:9}));
fs.writeFileSync(root+'facilities.json',JSON.stringify({edition:manifest.edition,source:manifest.files['facilities-nov2024.csv'].url,records:facilities},null,2)+'\n');
fs.writeFileSync(root+'statistics.json',JSON.stringify({regions:{},sources:{}})+'\n');
fs.writeFileSync('dist/data/region-colors/antarctica.json',JSON.stringify({version:2,country:'antarctica',level:'Research facilities',records:[]})+'\n');
fs.writeFileSync(root+'sources.json',JSON.stringify({facilities:manifest,coast:{source:'Natural Earth 1:10m, retained nordics/ne-countries.json.gz',license:'Public domain',description:'One continental outline; no territorial sectors.'},treaty:{url:'https://www.ats.aq/e/antarctictreaty.html',note:'Article IV preserves positions on territorial claims without resolving sovereignty.'},coverage:{facilities:facilities.length,edition:manifest.edition,policy:'All listed facilities south of 60°S, including stations, camps and support sites. Subantarctic sites north of the Treaty area are excluded. Statuses refer to this edition, not a live operating report. Coordinates retain the source precision; moving ice-shelf stations can move.'}},null,2)+'\n');
await (await import('./build-antarctic-cap.mjs')).buildAntarcticCap();
(await import('./build-antarctic-flags.mjs')).buildAntarcticFlags();
console.log(facilities.length,'COMNAP Antarctic facilities built; types:',[...new Set(facilities.map(r=>r.kind))].join(', '));
