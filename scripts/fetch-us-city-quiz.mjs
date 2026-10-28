// US city quiz dots: each city's Wikidata coordinate, which marks its centre rather than the
// middle of its city limits (Jacksonville, Anchorage and Juneau span huge consolidated areas).
// Items are matched by their Census place code (Wikidata P774, FIPS 55-3), taken from the
// Census places already in the US catalogue.
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load} from './geo-index.mjs';
import {cityQuizPlaces} from './us-city-quiz-places.mjs';
const out='scripts/boundary-sources/united-states/city-quiz-wikidata.json.gz';
const places=cityQuizPlaces(load('dist/data/europe/united-states/catalogue.bin'));
const fips=[...new Set(places.map(p=>p.record.code.slice(0,2)+'-'+p.record.code.slice(2)))];
const query=`SELECT ?item ?fips ?coord ?label WHERE { VALUES ?fips {${fips.map(f=>JSON.stringify(f)).join(' ')}} ?item wdt:P774 ?fips; wdt:P625 ?coord. OPTIONAL{?item rdfs:label ?label FILTER(lang(?label)="en")} }`;
const response=await fetch('https://query.wikidata.org/sparql',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/sparql-results+json','User-Agent':'BoundaryAtlas/1.0 (+https://github.com/Ethan-H147/china_interactive_map)'},body:'query='+encodeURIComponent(query)});
if(!response.ok)throw Error('Wikidata '+response.status);
const items=(await response.json()).results.bindings.map(b=>{const [lon,lat]=b.coord.value.match(/Point\(([^)]+)\)/)[1].split(' ').map(Number);return {item:b.item.value.split('/').pop(),fips:b.fips.value,label:b.label?.value||'',lon,lat};});
fs.writeFileSync(out,gzipSync(JSON.stringify({retrieved:new Date().toISOString().slice(0,10),provider:'Wikidata, coordinate location (P625) of items with a FIPS 55-3 code (P774)',license:'CC0 1.0',licenseURL:'https://creativecommons.org/publicdomain/zero/1.0/',items},null,0),{level:9}));
const found=new Set(items.map(i=>i.fips));console.log('Retained',items.length,'Wikidata coordinates;',fips.filter(f=>!found.has(f)).length,'codes without one:',fips.filter(f=>!found.has(f)).join(' '));
