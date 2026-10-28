import assert from 'node:assert/strict';
// With a first-level unit selected, the Quiz tab opens the next level's quiz scoped to it.
const point=(p,lngLat)=>p.evaluate(`(()=>{const q=map.project(${JSON.stringify(lngLat)}),b=map.getCanvas().getBoundingClientRect();return [b.left+q.x,b.top+q.y]})()`);
export default [{name:'China province selection opens its prefecture quiz',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#china');
 await p.tap('#tab-quiz');await p.settle();
 assert.equal(await p.evaluate('document.getElementById("cn-quiz-level").value'),'provinces','No selection keeps the province quiz');
 await p.tap('#tab-layers');await p.evaluate('selectRegion(provinceLayers.get(440000),440000,false)');await p.settle();
 await p.tap('#tab-quiz');await p.settle();
 assert.equal(await p.evaluate('document.getElementById("quiz-scope").value'),'440000','Guangdong is the quiz scope');
 assert.equal(await p.evaluate('document.getElementById("quiz-panel").hidden'),false,'Prefecture quiz panel is open');
 assert.equal(await p.evaluate('document.getElementById("china-quiz-level").value'),'prefectures');
 assert.equal(await p.evaluate('document.getElementById("quiz-start").disabled'),false);
}},{name:'US state selection opens its county quiz',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#united-states');
 await p.evaluate('void map.jumpTo({center:[-75.5,42.9],zoom:5.5})');await p.settle();
 await p.tap(await point(p,[-75.5,42.9]));await p.settle();
 assert.equal(await p.evaluate('currentAtlas().getSelectionRoot()'),'US-NY');
 await p.tap('#us-tab-quiz');await p.waitFor('document.getElementById("us-counties-quiz-panel")&&!document.getElementById("us-counties-quiz-panel").hidden',{timeout:30000});await p.settle();
 assert.equal(await p.evaluate('document.querySelector("#us-counties-quiz-panel select[id$=scope]")?.value'),'US-NY','New York is the county quiz scope');
}}];
