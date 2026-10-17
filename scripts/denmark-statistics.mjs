import fs from 'node:fs';import assert from 'node:assert/strict';
const base='scripts/statistics-sources/denmark/';
export const retained=name=>JSON.parse(fs.readFileSync(base+name+'.json'));
export function decodeStat(j){
 j=j.dataset||j;const ids=j.id||j.dimension.id,size=j.size||j.dimension.size;
 const keys=ids.map(id=>{const index=j.dimension[id].category.index;return Array.isArray(index)?index:Object.keys(index).sort((a,b)=>index[a]-index[b]);});
 return Object.entries(j.value||{}).map(([offset,value])=>{let rest=+offset;const row={value};for(let i=ids.length-1;i>=0;i--){row[ids[i]]=keys[i][rest%size[i]];rest=Math.floor(rest/size[i]);}return row;});
}
export function denmarkFacts(){
 const dk=decodeStat(retained('denmark-population').data),population=new Map(dk.map(r=>[r['OMRÅDE'],{value:r.value,year:2026,date:'2026-07-01',periodLabel:'1 July 2026 population',method:'register',source:'denmarkPopulation'}]));
 const fo=retained('faroe-population'),meta=retained('faroe-population-metadata').data.variables.find(v=>v.code==='municipality/village'),names=new Map(meta.values.map((id,i)=>[id,meta.valueTexts[i].replace(/\s+municipality/i,'').trim()]));
 const faroe=new Map(fo.data.data.map(r=>[names.get(r.key[1]),{value:+r.values[0],year:2026,date:'2026-01-01',periodLabel:'1 January 2026 population',method:'register',source:'faroePopulation'}]));
 const gl=new Map();for(const row of retained('greenland-population').data.data){const id=row.key[3];gl.set(id,(gl.get(id)||0)+ +row.values[0]);}
 const greenland=new Map([...gl].map(([id,value])=>[id,{value,year:2026,date:'2026-07-01',periodLabel:'1 July 2026 population',method:'register',source:'greenlandPopulation'}]));
 assert.equal(greenland.get('00GRL').value,56945);assert.equal(faroe.get('Total population').value,54880);
 return {population,faroe,greenland};
}
export const denmarkStatSources={
 denmarkPopulation:{title:'Statistics Denmark · FOLK1A population register, 1 July 2026',url:'https://www.statbank.dk/FOLK1A',license:'Statistics Denmark open data'},
 faroePopulation:{title:'Statistics Faroe Islands · IB01070 resident population, 1 January 2026',url:'https://statbank.hagstova.fo/pxweb/en/H2/H2__IB__IB01/fo_midalal.px/',license:'Official statistics, source attribution'},
 greenlandPopulation:{title:'Statistics Greenland · BEESTM2 population, 1 July 2026',url:'https://bank.stat.gl/BEESTM2',license:'Official statistics, source attribution'}
};
export function applyDenmarkStatistics(dir){
 const file=dir+'/statistics.json',s=JSON.parse(fs.readFileSync(file));Object.assign(s.sources,denmarkStatSources);
 const euro=decodeStat(retained('regional-gdp').data),fx=decodeStat(retained('exchange').data),gdp=new Map();
 const rate=(currency,year)=>fx.find(r=>r.currency===currency&&r.time===String(year))?.value;
 for(const id of ['DK01','DK02','DK03','DK04','DK05']){
  const rows=euro.filter(r=>r.geo===id),year=Math.max(...rows.map(r=>+r.time).filter(y=>rows.some(r=>r.time===String(y)&&r.unit==='EUR_HAB')&&rows.some(r=>r.time===String(y)&&r.unit==='MIO_NAC')));
  gdp.set(id,{year,total:rows.find(r=>r.time===String(year)&&r.unit==='MIO_NAC').value*1e6,pc:rows.find(r=>r.time===String(year)&&r.unit==='EUR_HAB').value*rate('DKK',year),source:'denmarkGDP',pcNote:'Eurostat published EUR per capita converted to DKK using the same-year annual average exchange rate.'});
 }
 const gl=retained('greenland-gdp').data.data;gdp.set('DK-GL',{year:2023,total:+gl.find(r=>r.key[1]==='01').values[0]*1e6,pc:+gl.find(r=>r.key[1]==='02').values[0]*1000,source:'greenlandGDP'});
 gdp.set('DK-FO',{year:2025,total:+retained('faroe-gdp').data.data[0].values[0]*1e6,pc:+retained('faroe-gdp-pc').data.data[0].values[0]*1000,source:'faroeGDP'});
 Object.assign(s.sources,{
  denmarkGDP:{title:'Eurostat · regional GDP and GDP per capita, NUTS 2, current prices',url:'https://ec.europa.eu/eurostat/databrowser/view/nama_10r_2gdp/default/table',license:'CC BY 4.0'},
  greenlandGDP:{title:'Statistics Greenland · NRE10 trends in GDP, 2023',url:'https://bank.stat.gl/NRE10',license:'Official statistics, source attribution'},
  faroeGDP:{title:'Statistics Faroe Islands · TB02010 and TB02015 national GDP, 2025',url:'https://statbank.hagstova.fo/pxweb/en/H2/H2__TB__TB02/',license:'Official statistics, source attribution'},
  denmarkExchange:{title:'Eurostat · annual average exchange rates (DKK and USD per euro)',url:'https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table',license:'CC BY 4.0'}
 });
 for(const [id,m]of gdp){const r=s.regions['denmark:'+id],exchangeRate=rate('DKK',m.year)/rate('USD',m.year);assert(r&&exchangeRate>0);const common={year:m.year,currency:'DKK',priceBasis:'current',source:m.source,exchangeRate,exchangeYear:m.year,exchangeSource:'denmarkExchange'};
  r.gdp={...common,value:m.total,usd:m.total/exchangeRate};r.gdpPerCapita={...common,value:m.pc,usd:m.pc/exchangeRate,...(m.pcNote?{note:m.pcNote}:{})};
  r.note=[r.note,'Nominal GDP and GDP per capita use the published '+m.year+' statistical basis; the population card has its own reference date.'].filter(Boolean).join(' ');
 }
 fs.writeFileSync(file,JSON.stringify(s)+'\n');console.log('Denmark statistics: 7 GDP/per-capita pairs; native DKK and same-year USD conversions.');
}
