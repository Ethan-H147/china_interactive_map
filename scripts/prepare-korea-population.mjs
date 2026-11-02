import fs from 'node:fs';
import {applyKoreaPopulation} from './korea-population.mjs';
const file=new URL('../dist/data/region-statistics.json',import.meta.url),data=JSON.parse(fs.readFileSync(file));
console.log(JSON.stringify((c=>({KR:c.KR,KP:c.KP,missing:c.missing.length}))(applyKoreaPopulation(data))));fs.writeFileSync(file,JSON.stringify(data));
