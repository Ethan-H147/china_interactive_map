import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {source} from './fetch-north-andes.mjs';
import {fc,command} from './build-regional-dataset.mjs';
const {unzipSync}=createRequire(import.meta.url)('fflate');
export const norm=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function csv(s){const rows=[];let row=[],v='',quoted=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){v+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(v.replace(/\r$/,''));v='';if(c==='\n'){rows.push(row);row=[];}}else v+=c;}if(v||row.length){row.push(v.replace(/\r$/,''));rows.push(row);}return rows;}
function populationMap(iso,level){const [head,...rows]=csv(source(`${iso}-population-${level}.csv`).toString().replace(/^\uFEFF/,''));return new Map(rows.filter(r=>r.length>3).map(r=>{const p=Object.fromEntries(head.map((h,i)=>[h,r[i]]));return[p[`ADM${level}_PCODE`],+p.T_TL];}));}
const population=(value,year,source)=>Number.isFinite(value)?{value,year,source,method:year===2025?'DANE official midyear population projection':'official census count',periodLabel:year+(year===2025?' population projection':' census population')}:undefined;
export async function prepareNorthAndes(){
 const datasets=[];
 for(const [country,iso,levels]of [['ecuador','ecu',3],['venezuela','ven',3],['colombia','col',2]]){
  const units=new Map(),raw=JSON.parse(source(`${iso}-adm${levels}.json`)),people=iso==='ecu'?null:new Map([1,2].map(level=>[level,populationMap(iso,level)]));
  const bottom=fc(raw.features.map(f=>{const p=f.properties;for(let level=1;level<=levels;level++){const id=p[iso==='ven'?`adm${level}_pcode`:`ADM${level}_PCODE`],name=p[iso==='ven'?`adm${level}_name`:`ADM${level}_${iso==='ecu'?'ES':'ES'}`]||p[`ADM${level}_EN`];assert(id&&name,iso+' identity '+JSON.stringify(p));if(units.has(id))continue;const dependency=iso==='ven'&&/Dependencias/.test(p.adm1_name),n=iso==='ven'&&name==='Vargas'?'La Guaira':name;
    units.set(id,{id,level,parent:level===1?null:p[iso==='ven'?`adm${level-1}_pcode`:`ADM${level-1}_PCODE`],en:n,local:n,localLang:'es',aliases:[name,...(id==='VE01'?['Caracas']:[])],kind:iso==='ecu'?['Province','Canton','Parish'][level-1]:iso==='ven'?(dependency?'Federal dependencies':level===1?(id==='VE01'?'Capital district':'State'):['','Municipality','Parish'][level-1]):level===1?(id==='CO11'?'Capital district':'Department'):'Municipal area',kindLocal:iso==='ecu'?['Provincia','Cantón','Parroquia'][level-1]:iso==='ven'?(dependency?'Dependencias Federales':level===1?(id==='VE01'?'Distrito Capital':'Estado'):level===2?'Municipio':'Parroquia'):level===1?(id==='CO11'?'Distrito Capital':'Departamento'):'Área local',...(people?.get(level)?.has(id)?{population:population(people.get(level).get(id),iso==='col'?2025:2011,iso==='col'?'danePopulation':'inePopulation')}:{})});
   }const id=p[iso==='ven'?`adm${levels}_pcode`:`ADM${levels}_PCODE`];return{...f,properties:{id}};}));
  if(iso==='ecu'){
   const rows=csv(new TextDecoder('windows-1252').decode(unzipSync(source('ecu-population-2022.zip'))['1.2.csv'])).filter(r=>r[1]&&Number.isFinite(+r[4]?.replaceAll(',',''))&&+r[4].replaceAll(',','')>0);
   const hierarchy=id=>{const u=units.get(id);return u?[...hierarchy(u.parent),norm(u.local)]:[];};
   const nameKey=r=>norm(r[1])+'|'+norm(r[2])+'|'+norm(r[3]),table=new Map(rows.map(r=>[nameKey(r),+r[4].replaceAll(',','')]));
   const unmatched=[];for(const u of units.values()){const names=hierarchy(u.id),key=u.level===1?[names[0],'total'+names[0],'total'+names[0]].join('|'):u.level===2?[...names,'total'+names[1]].join('|'):names.join('|');const count=table.get(key);if(count!==undefined)u.population=population(count,2022,'inecPopulation');else unmatched.push([u.id,u.local,key]);}
   console.log('Ecuador census unmatched',unmatched.length,unmatched.slice(0,30));
  }
  if(iso==='ven'){
   const top=JSON.parse(source('ven-adm1.json')).features,second=JSON.parse(source('ven-adm2.json')).features;
   // The reference includes one federal-dependencies equivalent at each tier.
   for(const [level,features]of [[1,top],[2,second]])for(const f of features){const id=f.properties[`adm${level}_pcode`];if(!units.has(id))console.log('Missing lower geometry for Venezuela unit',level,id,f.properties[`adm${level}_name`]);}
   for(const u of units.values())if(u.id==='VE01')u.note='Distrito Capital covers Libertador. Metropolitan Caracas also extends into Miranda; their populations are not combined.';
   for(const u of units.values())if(/Dependencias/.test(u.local))Object.assign(u,{focusOnEntry:true,focusPartsOnEntry:true,note:'Federal dependencies reference area. This is not an additional ordinary state, municipality or parish. No census population is inferred.'});
  }
  if(iso==='ecu'){const r=[...units.values()].find(u=>u.level===1&&norm(u.local)==='galapagos');Object.assign(r,{focusOnEntry:true,focusPartsOnEntry:true});}
  if(iso==='col'){const r=[...units.values()].find(u=>u.level===1&&norm(u.local).includes('sanandres'));if(r)Object.assign(r,{focusOnEntry:true,focusPartsOnEntry:true});}
  datasets.push({country,iso:iso.toUpperCase(),units,bottom:await command(bottom,'-clean gap-fill-area=0'),levels});console.log('Units',country,[...Array(levels)].map((_,i)=>[...units.values()].filter(u=>u.level===i+1).length));
 }
 return datasets;
}
