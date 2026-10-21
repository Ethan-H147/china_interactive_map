import assert from 'node:assert/strict';
import {createRenderBudget,resizeDuringMotion} from '../dist/render-budget.mjs';
const frames=(budget,hz,start,duration)=>{const changes=[];for(let t=start;t<start+duration;t+=1000/hz){const value=budget.sample(t);if(value!==null)changes.push(value);}return changes;};
{
 const budget=createRenderBudget({quality:'balanced',deviceRatio:2,displayFps:120});budget.start(0);
 assert.deepEqual(frames(budget,60,0,4000),[],'A stable 60 callback rate preserves Balanced resolution');assert.equal(budget.ratio(),1.5);
 budget.start(4000);assert.deepEqual(frames(budget,40,4000,4000),[1.25,1],'Sustained missed frames use two bounded steps');assert.equal(budget.ratio(),1);
 budget.stop();assert.deepEqual(frames(budget,20,8000,3000),[],'Idle and hidden time do not change the budget');
 budget.configure({quality:'full'});budget.start(12000);assert.deepEqual(frames(budget,20,12000,4000),[]);assert.equal(budget.ratio(),2,'Full resolution stays native');
 budget.configure({quality:'balanced'});assert.equal(budget.ratio(),1.5,'A changed quality resets learned resolution');
}
{
 const budget=createRenderBudget({quality:'performance',deviceRatio:2,displayFps:120});budget.start(0);assert.equal(budget.snapshot().targetFps,90);
 assert.deepEqual(frames(budget,90,0,3000),[],'Stable 90 callback timing needs no reduction');
 budget.start(4000);assert.deepEqual(frames(budget,60,4000,4000),[.875,.75]);assert.equal(budget.ratio(),.75);
 budget.reset();budget.configure({displayFps:60});budget.start(8000);assert.deepEqual(frames(budget,60,8000,4000),[],'A 60 Hz callback ceiling is not chased with lower resolution');assert.equal(budget.ratio(),1);assert.equal(budget.snapshot().requestedFps,90);assert.equal(budget.snapshot().targetFps,60);
 budget.configure({displayFps:30});assert.equal(budget.snapshot().targetFps,30,'Low-power callback scheduling is respected');
}
{
 const budget=createRenderBudget({quality:'balanced',deviceRatio:1});budget.start(0);assert.deepEqual(frames(budget,30,0,4000),[]);assert.equal(budget.ratio(),1,'Balanced preserves at least one sample per CSS pixel');
 const fast=createRenderBudget({quality:'balanced',deviceRatio:2});fast.start(0);frames(fast,60,0,500);assert.equal(fast.sample(20000),null,'A suspended tab is not a slow frame');assert.equal(fast.ratio(),1.5);
}
{
 let resizing=0,repaints=0;const map={_overridePixelRatio:2,_lostContextStyle:{style:null},painter:{context:{gl:{isContextLost:()=>false}}},_resizeInternal(constrain){assert.equal(constrain,false);resizing++;},triggerRepaint(){repaints++;},stop(){assert.fail('A canvas resize must not stop the camera');}};
 assert(resizeDuringMotion(map,1.25,'6.11.2'));assert.equal(map._overridePixelRatio,1.25);assert.equal(resizing,1);assert.equal(repaints,1);
 assert.equal(resizeDuringMotion(map,.75,'7'),false);assert.equal(map._overridePixelRatio,1.25,'Unknown renderer retains its own resize path');
 map._lostContextStyle.style={};assert.equal(resizeDuringMotion(map,.75,'6.11.2'),false);map._lostContextStyle.style=null;
 map._resizeInternal=()=>{throw Error('allocation failed');};assert.throws(()=>resizeDuringMotion(map,.75,'6.11.2'),/allocation failed/);assert.equal(map._overridePixelRatio,1.25,'Failed resize restores the ratio override');
}
console.log('Motion budgets: stable cadence, sustained drops, limited steps, browser ceilings, full sharpness, suspension and gesture-preserving resize passed.');
