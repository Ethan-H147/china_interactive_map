import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parseTable,matchRows} from './population.mjs';
import {readData} from './read-data.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
const source=read('population-source.json'),data=read('../dist/data/region-population.json'),report=read('population-match-report.json');
const display=readData('display-boundaries.json'),features=[...display.provinces.features,...display.subdivisions.features];
const matched=matchRows(source.rows,features);
assert.deepEqual(data.regions,matched.regions);
assert.deepEqual(report.unmatched,matched.unmatched);
assert.deepEqual(data.coverage,{sourceRows:684,matchedRegions:318,unmatchedRows:366});
assert.equal(data.coverage.sourceRows,data.coverage.matchedRegions+data.coverage.unmatchedRows);
assert.equal(data.regions[420100].total,12447718);
assert.equal(data.regions[320500].total,12748262); // Suzhou, Jiangsu
assert.equal(data.regions[341300].total,5324476); // Suzhou, Anhui: a different city
assert.equal(data.regions[810000].date,'2020年底');
assert.equal(data.regions[810000].towns,null);
assert.equal(data.regions[820000].date,'2020第四季度');
assert.equal(data.regions[820000].total,683218);
assert.equal(data.regions[500000].total,32054159);
assert.equal(data.regions[110000].total,21893095);
assert.equal(data.regions[371300].total,11018365);
assert.equal(data.regions[141000].name,'临汾市');
assert.equal(data.regions[141000].total,3976481);
assert.equal(data.regions[141000].towns,2114457);
assert.equal(data.regions[141000].urbanCore,666185);
assert.equal(data.regions[141000].date,'2020-11-01');
assert(!report.unmatched.some(r=>r.province==='山西'&&r.name==='临汾市'));
// The original misspelled row must remain unmatched; never guess a city or ignore its province.
const misspelled=matchRows([{...source.rows[data.regions[141000].sourceRow-1],name:'临沂市'}],features);
assert.equal(Object.keys(misspelled.regions).length,0);
assert.deepEqual(misspelled.unmatched,[{row:1,province:'山西',name:'临沂市'}]);
assert.deepEqual(report.flagged.map(r=>r.adcode),['371400','621100','640300','650200']);
for(const [adcode,r] of Object.entries(data.regions)){
  const p=features.find(f=>String(f.properties.adcode)===adcode)?.properties;
  assert(p,'Population must identify an actual mapped region');
  assert.equal(r.name,source.rows[r.sourceRow-1].name);
  for(const measure of ['total','towns','urbanCore'])assert(r[measure]===null||Number.isSafeInteger(r[measure])&&r[measure]>0);
  assert(['2020-11-01','2020年底','2020第四季度'].includes(r.date));
}
const fixture='<table><tr><th>省市</th><th>城市</th><th>层级</th><th>地区人口</th><th>城镇人口</th><th>城区人口</th><th>普查年月日</th></tr><tr><td rowspan="2">江苏</td><td>苏州市<sup>[1]</sup></td><td>地级市</td><td>1,234</td><td></td><td>456</td><td rowspan="2">2020-11-01</td></tr><tr><td>昆山市</td><td>县级市</td><td>789</td><td>600</td><td>400</td></tr><tr><td>香港</td><td>香港</td><td>特别行政区</td><td>100</td><td></td><td>100</td><td>2020年底</td></tr></table>';
assert.deepEqual(parseTable(fixture),[
  {province:'江苏',name:'苏州市',type:'地级市',total:1234,towns:null,urbanCore:456,date:'2020-11-01'},
  {province:'江苏',name:'昆山市',type:'县级市',total:789,towns:600,urbanCore:400,date:'2020-11-01'},
  {province:'香港',name:'香港',type:'特别行政区',total:100,towns:null,urbanCore:100,date:'2020年底'}
]);
const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);};
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),context=vm.createContext({$,regionPopulation:data,provincePopulation:read('../dist/data/province-population.json')});
vm.runInContext(app.slice(app.indexOf('function renderPopulation('),app.indexOf('function isPrefectureLevel(')),context);
for(const f of features){context.renderPopulation(f.properties);assert.equal($('population').hidden,!(f.properties.level==='province'||data.regions[f.properties.adcode]));}
for(const f of display.provinces.features){const record=context.provincePopulation.china[f.properties.adcode];context.renderPopulation(f.properties);assert.equal($('population-total').textContent,record.total.toLocaleString('en-US'));assert.equal($('population-date').textContent,record.dateLabel);assert.equal($('population-source').href,record.sourceUrl);assert.equal($('population-breakdown').hidden,true);}
context.renderPopulation({adcode:420100,provinceCode:420000});
assert.equal($('population-total').textContent,'12,447,718');
assert.equal($('population-date').textContent,'1 November 2020');
assert.equal($('population-quality').hidden,true);
context.renderPopulation({adcode:810000});
assert.equal($('population-towns').textContent,'Not reported');
assert.equal($('population-date').textContent,'End of 2020');
context.renderPopulation({adcode:810001,provinceCode:810000});
assert.equal($('population').hidden,true); // Districts must not inherit the SAR's total.
context.renderPopulation({adcode:110101,provinceCode:110000});
assert.equal($('population').hidden,true); // Likewise for municipal districts.
context.renderPopulation({adcode:371400});
assert.equal($('population-total').textContent,'561,194');
assert.equal($('population-quality').hidden,false);
assert.match(app,/renderRegionNames\(p\);renderPopulation\(p\)/);
console.log(JSON.stringify({populationCoverage:data.coverage,datesVerified:true,regionScopingVerified:features.length,sourceErrorsFlagged:report.flagged.length}));
