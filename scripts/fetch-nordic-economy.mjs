import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
export const root='scripts/statistics-sources/nordics';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function readEconomy(name){
 const retained=JSON.parse(fs.readFileSync(root+'/'+name+'.json'));
 assert.equal(hash(Buffer.from(JSON.stringify(retained.data))),retained.sha256,'Retained economics hash '+name);
 return retained.data;
}
export async function fetchNordicEconomy(){
 fs.mkdirSync(root,{recursive:true});
 async function json(name,url,query){
  const file=root+'/'+name+'.json';if(fs.existsSync(file))return readEconomy(name);
  const r=await fetch(url,{...(query?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query)}:{}),signal:AbortSignal.timeout(90000)});
  assert(r.ok,name+' HTTP '+r.status);const data=await r.json();assert(!data.error,JSON.stringify(data.error));
  fs.writeFileSync(file,JSON.stringify({url,retrieved:'2026-10-19',...(query?{query}:{}),sha256:hash(Buffer.from(JSON.stringify(data))),data})+'\n');console.log('Retained '+name);return data;
 }
 const pxQuery=(dimensions)=>({query:Object.entries(dimensions).map(([code,values])=>({code,selection:{filter:values==='*'?'all':'item',values:values==='*'?['*']:values}})),response:{format:'json'}});
 for(const [name,table,codes]of [['sweden-counties','NR0105ENS2010T01A',['NR0105AH','NR0105AJ']],['sweden-municipalities','NR0105ENS2010T06A',['NR0105AW','NR0105AY']]]){
  const url='https://api.scb.se/OV0104/v1/doris/en/ssd/NR/NR0105/NR0105A/'+table;
  await json(name+'-metadata',url);await json(name,url,pxQuery({Region:'*',ContentsCode:codes,Tid:['2024']}));
 }
 const noURL='https://data.ssb.no/api/v0/en/table/';
 const noRegions=['03','34','42','11','46','15','50','18','21','31','32','33','39','40','55','56'];
 for(const [name,table,code]of [['norway-gva','09391','BNPB'],['norway-mean-population','03037','Personer1']]){
  const url=noURL+table;await json(name+'-metadata',url);
  const query=pxQuery({Region:noRegions,ContentsCode:[code],Tid:['2023']});query.response.format='json-stat2';await json(name,url,query);
 }
 const fiRegions=['MK01','MK02','MK04','MK05','MK06','MK07','MK08','MK09','MK10','MK11','MK12','MK13','MK14','MK15','MK16','MK17','MK18','MK19','MK21'];
 for(const [name,table,dimensions]of [['finland-gdp','12bd',{alue_23_20250101:fiRegions,taloustoimi_1_20180101:['B1GMH'],toimiala_79_20180101:['SSS'],sektoriluokitus_7_20230101:['S1'],timeperiod_y:['2023'],contentscode:['CP']}],['finland-gdp-per-capita','12bc',{alue_23_20250101:fiRegions,timeperiod_y:['2023'],contentscode:['GDPcap']}]]){
  const url='https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/altp/'+table+'.px';await json(name+'-metadata',url);
  const query=pxQuery(dimensions);query.response.format='json-stat2';await json(name,url,query);
 }
 await json('exchange','https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ert_bil_eur_a?format=JSON&statinfo=AVG&sinceTimePeriod=2023&untilTimePeriod=2024&currency=USD&currency=NOK&currency=SEK');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await fetchNordicEconomy();
