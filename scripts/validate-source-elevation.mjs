import assert from 'node:assert/strict';
import {runSourceUpdate,maxContentElevation,setSourceCoverageEnabled,setElevationScanReuse} from '../dist/globe-renderer.mjs';
const transform={},style={_order:['land','labels'],_layers:{land:{type:'fill',source:'land'},labels:{type:'symbol',source:'labels'}}};
let scans=0;function native(){scans++;return this._maxContentElevationSeen+50;}
const land={id:'land',transform,_maxContentElevationSeen:120},labels={id:'labels',transform,_maxContentElevationSeen:30};
assert.equal(maxContentElevation(native,land),170,'Outside an update scope retains native behavior');
runSourceUpdate(transform,()=>{assert.equal(maxContentElevation(native,land),120,'Preserve the previously observed high-water mark');assert.equal(maxContentElevation(native,labels),80,'Symbol sources retain native evaluation');},style);
assert.equal(scans,2);
runSourceUpdate(transform,()=>{style._order.push('new-label');style._layers['new-label']={type:'symbol',source:'land'};assert.equal(maxContentElevation(native,land),170,'Synchronous style mutations fall back to native');},style);
assert.equal(scans,3);style._order.pop();delete style._layers['new-label'];
setSourceCoverageEnabled(transform,false);runSourceUpdate(transform,()=>assert.equal(maxContentElevation(native,land),170),style);setSourceCoverageEnabled(transform,true);
setElevationScanReuse(false);runSourceUpdate(transform,()=>assert.equal(maxContentElevation(native,land),170),style);setElevationScanReuse(true);
assert.throws(()=>runSourceUpdate(transform,()=>{throw Error('interrupted');},style));assert.equal(maxContentElevation(native,land),170,'Exceptions clear update scope');
console.log('Source elevation: native symbol evaluation, high-water mark, scope cleanup, style mutation and diagnostic fallbacks passed.');
