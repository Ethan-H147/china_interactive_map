import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load} from './geo-index.mjs';
import {combineLondonSettlements} from './london-settlement.mjs';
const base='dist/data/europe/united-kingdom/';
const data=combineLondonSettlements(load(base+'settlements.json'),load(base+'catalogue.bin'),load(base+'statistics.json'));
fs.writeFileSync(base+'settlements.json',JSON.stringify(data)+'\n');
if(fs.existsSync(base+'settlements.bin'))fs.writeFileSync(base+'settlements.bin',gzipSync(JSON.stringify(data),{level:9}));
console.log('London: one city dot, two geographic scopes, borough selections and older links retained.');
