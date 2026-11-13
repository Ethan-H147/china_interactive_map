import assert from 'node:assert/strict';
import {prepareAllSettlementZooms} from './prepare-settlement-zooms.mjs';
import {load} from './geo-index.mjs';
import {expandSettlementRecords,settlementFeatures} from '../dist/settlement-layer.mjs';
const rows=prepareAllSettlementZooms({check:true});
assert(rows.length>0);
for(const row of rows){
 const data=load(row.file),records=expandSettlementRecords(data);
 assert.deepEqual(settlementFeatures(records,data.dotzooms),settlementFeatures(records),row.file+': precomputation preserves every point, identifier and admission threshold without changing label records');
}
console.log(rows.length+' settlement datasets: exact current admission thresholds and point features, without changing settlement records.');
