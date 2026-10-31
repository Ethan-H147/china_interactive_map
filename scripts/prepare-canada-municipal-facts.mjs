import fs from 'node:fs';
import {prepareCanadaSharedPages} from './prepare-canada-shared-pages.mjs';
import {canadaTargets,isMunicipalGovernment} from './canada-municipalities.mjs';
import {load,write} from './us-geography.mjs';
export function prepareCanadaMunicipalFacts(root='dist/data/europe/canada/'){
 const top=canadaTargets(),source='dist/data/canada-municipal-flag-sources.json',flags={...(fs.existsSync(source)?load(source).flags:{}),...(fs.existsSync('dist/data/canada-municipal-fotw-flag-sources.json')?load('dist/data/canada-municipal-fotw-flag-sources.json').flags:{})},facts={asOf:'2025-07-01',boundaryYear:2021,limit:500,cutoffPopulation:top.at(-1).population,source:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501',records:{}};
 for(const r of top){const f=flags[r.id];facts.records[r.id]={rank:r.rank,population:r.population,...(f?{flag:Object.fromEntries(Object.entries(f).filter(([k])=>!['sha256','commonsSha1','sourceSha1','commonsFile','id','rank','evidence'].includes(k)))}:{})};}
 const catalogue=load(root+'catalogue.bin');for(const r of catalogue.records)if(r.level===3){delete r.municipalRank;r.municipality=isMunicipalGovernment(r.censusType,r.code.slice(0,2));r.aliases=[...new Set([...(r.aliases||[]),r.en+' '+r.kind+' '+r.provinceName,r.en+' '+r.kind+' '+r.province.slice(3)])];if(facts.records[r.id])r.municipalRank=facts.records[r.id].rank;}write(root+'catalogue.bin',catalogue);const stats=load(root+'statistics.json');for(const s of Object.values(stats.regions))if(s.level>1&&s.population)s.population.coverageNote='2021 census boundaries';write(root+'statistics.json',stats);
 write(root+'municipalities/facts.json',facts);prepareCanadaSharedPages(root);console.log('Canada municipal facts:',top.length,'targets;',Object.values(facts.records).filter(r=>r.flag).length,'sourced flags.');return facts;
}
if(process.argv[1]?.endsWith('prepare-canada-municipal-facts.mjs'))prepareCanadaMunicipalFacts();
