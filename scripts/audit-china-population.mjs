// A cheap consistency scan of existing website data. No network or census reads.
import fs from 'node:fs';
import {appendCensusReview} from './review-china-census.mjs';
const data=JSON.parse(fs.readFileSync('dist/data/region-population.json')).regions,names=JSON.parse(fs.readFileSync('dist/data/region-names.json')).regions;
const flagged=[];
for(const [code,r] of Object.entries(data)){
 const impossible=[],outliers=[],ratio=(a,b)=>(100*a/b).toFixed(1)+'%';
 if(r.towns!=null&&r.total!=null&&r.towns>r.total)impossible.push('Cities and towns exceeds total');
 if(r.urbanCore!=null&&r.total!=null&&r.urbanCore>r.total)impossible.push('Urban core exceeds total');
 if(r.urbanCore!=null&&r.towns!=null&&r.urbanCore>r.towns)impossible.push('Urban core exceeds cities and towns');
 if(r.total>=1000000&&r.towns!=null&&r.towns/r.total<.1)outliers.push('Cities and towns is only '+ratio(r.towns,r.total)+' of total');
 if(r.towns>=500000&&r.urbanCore!=null&&r.urbanCore/r.towns<.1)outliers.push('Urban core is only '+ratio(r.urbanCore,r.towns)+' of cities and towns');
 if(impossible.length||outliers.length)flagged.push({code,english:names[code]?.en||r.name,chinese:r.name,priority:impossible.length?'Inconsistent':'Outlier',total:r.total,towns:r.towns,urbanCore:r.urbanCore,reasons:[...impossible,...outliers],sourceRow:r.sourceRow});
}
flagged.sort((a,b)=>(a.priority==='Inconsistent'?0:1)-(b.priority==='Inconsistent'?0:1)||a.english.localeCompare(b.english));
const fmt=n=>n==null?'Not reported':n.toLocaleString('en-US');
const rows=flagged.map(r=>'| '+[r.english+' '+r.chinese,r.priority,fmt(r.total),fmt(r.towns),fmt(r.urbanCore),r.reasons.join('; ')].join(' | ')+' |');
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/china-population-review.md',`# China population review

Scanned ${Object.keys(data).length} mapped population records using existing website data only. The scan itself performs no external-source checks; applied corrections retain their source attribution. Rebuild with \`npm run audit:china-population\`.

“Inconsistent” means a subset exceeds its parent figure. “Outlier” means cities and towns is below 10% of a total of at least one million, or urban core is below 10% of a cities-and-towns population of at least 500,000. These thresholds identify candidates, not verified errors. Distributed settlements and different geographic definitions can produce valid outliers. This scan cannot detect every typo or say which column is wrong.

Shuozhou's previously verified urban-core correction (41,807 → 417,807) and the user-reviewed Wikipedia corrections for Meizhou, Zhanjiang, Baotou, Dezhou, Dingxi, Karamay and Wuzhong are applied. The latest four total-population corrections follow Wikipedia revision 95347066.

| City | Flag | Total | Cities and towns | Urban core | Reason to review |
| --- | --- | ---: | ---: | ---: | --- |
${rows.length?rows.join('\n'):'| None | — | — | — | — | No candidates under the checks above |'}
`);
fs.writeFileSync('artifacts/china-population-review.json',JSON.stringify({recordsScanned:Object.keys(data).length,method:'Existing-data consistency and ratio checks only',flagged},null,2)+'\n');
console.log(JSON.stringify({recordsScanned:Object.keys(data).length,candidates:flagged.length,inconsistent:flagged.filter(r=>r.priority==='Inconsistent').length,outliers:flagged.filter(r=>r.priority==='Outlier').length}));
for(const r of flagged)console.log(r.english+': '+r.reasons.join('; '));

appendCensusReview();
