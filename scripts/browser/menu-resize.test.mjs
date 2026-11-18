import assert from 'node:assert/strict';
const side='#united-kingdom-sidebar',button=side+' .details-expand',edge=side+' .details-resize-edge';
const measure=`(()=>{const s=document.querySelector('${side}'),m=document.getElementById('map-shell');return {width:s.getBoundingClientRect().width,map:m.clientWidth,enabled:s.classList.contains('details-resizable'),overflow:s.querySelector(".sidebar-scroll").scrollWidth>s.querySelector(".sidebar-scroll").clientWidth+1};})()`;
export default [{name:'Menu resize opt-in, dragging, keyboard and reset',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#united-kingdom');await p.evaluate('currentAtlas().restore("GB-C-E10000029").then(()=>true)');await p.settle();
 const initial=await p.evaluate(measure);await p.tap(button);let state=await p.evaluate(measure);assert(state.enabled);assert.equal(state.width,initial.width,'Enabling does not jump the width');
 const from=await p.evaluate(`(()=>{const r=document.querySelector('${edge}').getBoundingClientRect();return [r.x+r.width/2,r.y+160]})()`);
 await p.drag(from,[from[0]+220,from[1]]);await p.settle();state=await p.evaluate(measure);assert(Math.abs(state.width-initial.width-220)<2);assert(state.map<initial.map);assert(!state.overflow);
 await p.key('ArrowRight');assert.equal((await p.evaluate(measure)).width,state.width+10);
 await p.key('End');assert.equal((await p.evaluate(measure)).width,1000);await p.settle();await p.screenshot('menu-resize-wide');
 await p.tap(button);state=await p.evaluate(measure);assert(!state.enabled);assert.equal(state.width,initial.width);assert.equal(state.map,initial.map);
 await p.tap(button);await p.evaluate(`document.querySelector('${edge}').focus()`);await p.key('Home');assert.equal((await p.evaluate(measure)).width,280);await p.key('Escape');assert.equal((await p.evaluate(measure)).width,initial.width);assert(await p.evaluate('!!currentAtlas().getSelection()'),'Escape resets resizing before clearing selection');
 await p.tap(button);await p.viewport(700,900);assert(!await p.evaluate(`document.querySelector('${side}').classList.contains('details-resizable')`));await p.viewport(1280,900);assert.equal((await p.evaluate(measure)).width,initial.width);
 assert.equal(p.problems.length,0);assert.equal(p.failures.length,0);
}},{name:'Phone menu keeps its sheet controls',options:{width:390,height:844,mobile:true},async run(p,base){await p.open(base,'#united-kingdom');await p.evaluate('currentAtlas().restore("GB-C-E10000029").then(()=>true)');await p.settle();assert(!await p.evaluate(`document.querySelector('${button}').checkVisibility()`));assert(!await p.evaluate(`document.querySelector('${edge}').checkVisibility()`));}}];
