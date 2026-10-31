import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {matchRows,applyPopulationCorrections} from './population.mjs';
import {readData} from './read-data.mjs';
import {readCensus,censusFeatures,matchCensusRows,measures} from './china-census.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const source=readCensus(),data=read('../dist/data/region-population.json'),report=read('boundary-sources/china-population/census-comparison.json'),config=read('boundary-sources/china-population/census-matches.json');
assert.equal(createHash('sha256').update(fs.readFileSync(new URL('boundary-sources/china-population/china-census-2020-original.xlsx',import.meta.url))).digest('hex'),source.sha256);
assert.equal(source.sha256,'e41e889b1852a59ddc863c46449b0a4ac6ea276ebb7d5b1b83a6c48daffe7f34');
assert.equal(source.rows.length,3363);
assert(source.rows.every((r,i)=>r.row===i+6&&r.record===i+1));
const features=censusFeatures(),byCode=new Map(features.map(f=>[String(f.properties.adcode),f.properties]));
const used=[];
for(const m of report.matches.matched)for(const row of m.sourceRows||[m.row])used.push(row.row);
used.push(...report.matches.unmatched.map(r=>r.row));
assert.equal(used.length,source.rows.length,'All source rows accounted for');
assert.equal(new Set(used).size,used.length,'No row counted twice, including totals and aggregate components');
assert.deepEqual([...used].sort((a,b)=>a-b),source.rows.map(r=>r.row));
assert.deepEqual(report.sourceIssues,[]);
// Independent baseline: the original website figures plus prior reviewed fixes.
const wiki=read('population-source.json'),display=readData('display-boundaries.json'),before=matchRows(wiki.rows,[...display.provinces.features,...display.subdivisions.features]).regions;
applyPopulationCorrections(before,read('population-corrections.json'));
for(const [id,r] of Object.entries(before))for(const field of measures)if(r[field]!==null)assert.equal(data.regions[id][field],r[field],'Existing website figure preserved: '+id+' '+field);
for(const [id,r] of Object.entries(data.regions)){
 assert(byCode.has(id),'Every population identifies a mapped area');
 for(const field of measures)assert(r[field]===null||Number.isSafeInteger(r[field])&&r[field]>=0);
 const m=report.matches.matched.find(m=>m.adcode===id);
 if(!m){assert(before[id],'Unmatched records must come from the existing website');continue;}
 const parts=m.sourceRows||[source.rows.find(s=>s.row===m.row.row)];
 assert(parts.every(s=>s.province===source.rows.find(s=>s.row===m.row.row).province));
 if(!before[id])for(const field of measures){
  const expected=parts.every(s=>s[field]!==null)?parts.reduce((n,s)=>n+s[field],0):null;
  assert.equal(r[field],expected,'New figure equals exact source cells, preserving blanks: '+id+' '+field);
 }
 const census=m.level==='province'?data.census.provinces[id]:r.census;
 assert.equal(census.sha256,source.sha256);
 assert.equal(census.sheet,'人口基本状况');
 if(census.components)assert.equal(census.components.length,parts.length);
}
const independentlyDiffering=[];
for(const [id,r] of Object.entries(before)){
 const m=report.matches.matched.find(m=>m.adcode===id);
 if(!m)continue;
 for(const field of measures)if(r[field]!==null&&m.row[field]!==null&&r[field]!==m.row[field])independentlyDiffering.push(id+':'+field);
}
assert.deepEqual(report.differences.map(d=>d.adcode+':'+d.field).sort(),independentlyDiffering.sort());
assert.equal(report.differences.length,36);
assert.equal(new Set(report.differences.map(d=>d.adcode)).size,35);
assert.equal(report.availability.length,0);
for(const d of report.differences){
 const record=data.regions[d.adcode];
 assert(record.census.differences.some(x=>x.field===d.field&&x.workbook===d.workbook&&x.website===d.website));
 assert.equal(d.websiteDate,d.workbookDate,'Numerical differences are on the same census date');
}
assert.equal(data.regions[640200].total,2859074,'Shizuishan remains flagged rather than silently replaced');
assert.equal(data.regions[640200].census.values.total,751389);
assert.equal(data.regions[652300].total,1613585,'New autonomous prefecture');
assert.equal(data.regions[110101].total,708829,'Municipal district');
assert.equal(data.regions[110101].urbanCore,null,'Never inherit Beijing urban core');
assert.equal(data.regions[510104].total,902933,'County-level district');
assert.equal(data.regions[232701].total,54036,'Mohe source spelling exception');
assert.equal(data.regions[231283].total,480216,'Hailun must not receive the mislabeled Mohe record');
assert.equal(data.regions[410308].total,69142+416845,'Mengjin sum of complete predecessor areas');
assert.equal(data.regions[460302].total,1549+145,'Xisha and administered Zhongsha');
assert.equal(data.regions[460303].total,639);
for(const id of ['330113','330114','659011','659012'])assert(!data.regions[id],'No allocation from a parent for '+id);
assert.deepEqual(report.matches.missing.map(r=>r.adcode).sort(),['330113','330114','659011','659012']);
for(const id of ['330102','330109','330110','520201','520204'])assert(data.regions[id].scopeNote);
assert.equal(Object.values(data.census.provinces).length,31);
assert(Object.values(data.census.provinces).every(r=>!r.differences.length),'All existing mainland province totals agree');
// Regression: identically named districts must stay within their parent and province.
const fixture={...source,rows:[
 {row:1,province:'北京市',name:'北京市'},
 {row:2,province:'北京市',name:'朝阳区'},
 {row:3,province:'吉林省',name:'吉林省'},
 {row:4,province:'吉林省',name:'长春市'},
 {row:5,province:'吉林省',name:'朝阳区'},
 {row:6,province:'吉林省',name:'不存在的区'}
]};
const fixtureConfig={aliases:[],scopeNotes:{},missingNotes:{}};
const scoped=matchCensusRows(fixture,features,fixtureConfig);
assert.equal(scoped.matched.find(r=>r.row.row===2).adcode,'110105');
assert.equal(scoped.matched.find(r=>r.row.row===5).adcode,'220104');
assert.equal(scoped.unmatched.length,1);
assert.throws(()=>matchCensusRows({...fixture,rows:[...fixture.rows,fixture.rows[4]]},features,fixtureConfig),/Duplicate/);
assert.throws(()=>matchCensusRows(source,features,{...config,aliases:[{...config.aliases[0],sourceName:'changed'}]}),/needs review/);
assert.equal(report.summary.matchedRows+report.summary.unmatchedRows,source.rows.length);
assert.equal(report.summary.addedRegions,Object.keys(data.regions).length-Object.keys(before).length);
assert.deepEqual(report.summary,data.census.summary);
console.log(JSON.stringify({censusValidated:true,coverage:report.summary,records:Object.keys(data.regions).length,existingFiguresPreserved:true,sourceRowsAccountedFor:true,parentScopingVerified:true}));
