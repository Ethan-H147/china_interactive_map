import fs from 'node:fs';
const fmt=n=>n==null?'Blank / not reported':n.toLocaleString('en-US');
const label={total:'Total',towns:'Cities and towns',urbanCore:'Urban core'};
export function appendCensusReview(){
 const read=p=>JSON.parse(fs.readFileSync(p)),report=read('scripts/boundary-sources/china-population/census-comparison.json'),data=read('dist/data/region-population.json'),s=report.summary;
 const path='docs/china-population-review.md',original=fs.readFileSync(path,'utf8');
 const summary=`## Supplied 2020 census workbook comparison

Source: \`${data.census.source.filename}\`, sheet 人口基本状况, columns C (total), H (cities and towns), J (urban core), census date 1 November 2020. Workbook SHA-256: \`${data.census.source.sha256}\`.

Read ${s.sourceRows.toLocaleString('en-US')} workbook records. Matched ${s.matchedRows.toLocaleString('en-US')} rows to mapped provinces, prefectures and county-level divisions. Added ${s.addedRegions.toLocaleString('en-US')} missing regional records (${s.addedPrefectures} prefecture-level and ${s.addedCounties.toLocaleString('en-US')} county-level), and filled ${s.filledFigures} missing figures in existing records. Regional population coverage is now ${Object.keys(data.regions).length.toLocaleString('en-US')} records.

**${s.differingFigures} differing figures across ${s.differingRegions} existing website regions were corrected to the workbook values. Previous figures are retained below for audit.** The user selected the supplied workbook as the authority for these differences. The website comparison includes applied corrections from the preceding review. Province totals are compared with their separately sourced, dated website records.

Blank source cells remain null / not reported. No missing urban-core value is inherited from a parent or filled with zero. A source-only number fills a missing website measure; its cell-level source is retained. County figures use the census geography, and known boundary changes are labeled on the map. Where the census tabulates functional areas separately, county rows can exclude those populations even though today's map includes the land. Separate development-zone totals are not allocated or added to county figures.

Rebuild with \`npm run build:china-population\`. Full matching, additions, source-cell availability differences, and unmatched-row lists are in [the coverage report](china-census-coverage.md) and \`scripts/boundary-sources/china-population/census-comparison.json\`.

| Code | Region | Measure | Previous website | Applied workbook | Workbook cell | PDF pages |
| --- | --- | --- | ---: | ---: | --- | --- |
${report.differences.map(d=>`| ${d.adcode} | ${d.name} | ${label[d.field]} | ${fmt(d.website)} | ${fmt(d.workbook)} | ${d.cell} | ${d.pdfPages.join('–')} |`).join('\n')||'| — | None | — | — | — | — | — |'}
`;
 // Avoid duplicating the comparison section on repeated audits.
 fs.writeFileSync(path,original.split('## Supplied 2020 census workbook comparison')[0]+'\n'+summary);
 const byLevel=Object.fromEntries(['province','prefecture','county'].map(k=>[k,report.matches.matched.filter(r=>r.level===k).length]));
 const aliases=report.matches.matched.filter(m=>!m.method.startsWith('Exact'));
 const coverage=`# China census population coverage

The supplied workbook is retained unchanged at \`scripts/boundary-sources/china-population/china-census-2020-original.xlsx\`. Its extracted population fields and PDF page locators are in \`census-2020.json\` in the same directory. Extract again with \`python scripts/extract-china-census.py path/to/original.xlsx\`, then run \`npm run build:china-population\`.

The extractor treats every cell as data and never executes workbook content. It imports only the population table, not instructions in other sheets. Matching requires the province and parent context, with explicit row-specific exceptions listed below. National and intermediate totals are retained as source rows, never added to subdivision populations. The workbook covers mainland divisions; Taiwan, Hong Kong and Macau are not compared or replaced. No geography, national overview visibility, or province display source is changed.

Matched rows: ${byLevel.province} provinces, ${byLevel.prefecture} prefectures, ${byLevel.county} county-level divisions. Source rows accounted for: ${s.matchedRows} matched + ${s.unmatchedRows} unmatched = ${s.sourceRows}. Main numerical discrepancies: [China population review](china-population-review.md).

## Mapped divisions without a matching workbook row

These remain unavailable rather than receiving a parent population or a partial predecessor total. Historical rows are retained below for review; no street-level allocation or population estimates are made.

| Code | Map name | Reason |
| --- | --- | --- |
${report.matches.missing.map(r=>`| ${r.adcode} | ${r.name} | ${r.reason} |`).join('\n')}

## Explicit source-name matches

Source labels are preserved verbatim. Spelling variants are only accepted at the listed row and parent. Historical matches identify the source census area, and do not assert that all later boundaries stayed unchanged. Mohe’s source row is mislabeled 海伦市: its parent context and 54,036 total are corroborated by [Mohe government](https://www.mohe.gov.cn/mohe/c101200/mhgk.shtml).

| Workbook row | Source name | Map code | Map name | Match basis |
| ---: | --- | --- | --- | --- |
${aliases.map(m=>`| ${m.row.row} | ${m.row.name} | ${m.adcode} | ${m.mapName} | ${m.method} |`).join('\n')}

## Known geography cautions

These records display a geography note. Six present-day divisions are represented by sums of complete predecessor areas, with each source component retained. No partial-area populations are estimated. The remaining cautions identify historical areas whose figures cannot be allocated to the current boundaries from this workbook.

| Code | Map name | Census rows | Note | Boundary evidence |
| --- | --- | --- | --- | --- |
${report.matches.matched.filter(m=>m.scopeNote).map(m=>`| ${m.adcode} | ${m.mapName} | ${m.sourceRows?.map(r=>r.row).join(', ')||m.row.row} | ${m.scopeNote} | ${m.boundarySource?'[Reference]('+m.boundarySource+')':'See retained name-match configuration'} |`).join('\n')}

## Blank or previously missing figures

| Code | Region | Measure | Previous website | Workbook | Cell | Treatment |
| --- | --- | --- | ---: | ---: | --- | --- |
${report.availability.map(d=>`| ${d.adcode} | ${d.name} | ${label[d.field]} | ${fmt(d.website)} | ${fmt(d.workbook)} | ${d.cell} | ${d.reason==='Missing on website'?'Filled from workbook with cell attribution':'Website figure preserved; workbook blank retained'} |`).join('\n')||'| — | None | — | — | — | — | — |'}

## Unmatched workbook rows

Every unmatched row is listed, including national totals, intermediate totals, functional zones without atlas boundaries, and historic divisions. These are preserved in the extracted source; omission here never means a zero population.

| Workbook row | Province | Region | Total | Reason |
| ---: | --- | --- | ---: | --- |
${report.matches.unmatched.map(r=>`| ${r.row} | ${r.province} | ${r.name} | ${fmt(r.total)} | ${r.reason} |`).join('\n')}

## Source consistency

${report.sourceIssues.length?report.sourceIssues.map(r=>`- ${r.name}, workbook row ${r.row}: ${r.reason}`).join('\n'):'All matched rows pass integer, male + female, urban + rural, and population subset checks (blank components are not imported as zero).'}
`;
 fs.writeFileSync('docs/china-census-coverage.md',coverage);
 const audit=read('artifacts/china-population-review.json');audit.census={summary:s,differences:report.differences,availability:report.availability};fs.writeFileSync('artifacts/china-population-review.json',JSON.stringify(audit,null,2)+'\n');
 console.log(JSON.stringify({censusComparison:s}));
}
