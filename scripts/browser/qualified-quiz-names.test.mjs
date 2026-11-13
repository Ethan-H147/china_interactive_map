import assert from 'node:assert/strict';
export default [{name:'China duplicate prefecture names accept province qualifiers and explain ambiguity',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#china');await p.tap('#tab-quiz');
 await p.evaluate(`(()=>{const e=document.getElementById('cn-quiz-level');e.value='prefectures';e.dispatchEvent(new Event('change'));})()`);
 await p.evaluate(`(()=>{const e=document.getElementById('cn-prefectures-quiz-type');e.value='name';e.dispatchEvent(new Event('change'));})()`);
 await p.tap('#cn-prefectures-quiz-panel [data-q=start]');await p.settle();
 const read=part=>p.evaluate(`document.querySelector('#cn-prefectures-quiz-panel [data-q=${part}]').textContent`);
 async function answer(value){await p.evaluate(`document.getElementById('cn-prefectures-quiz-answer').value=${JSON.stringify(value)}`);await p.tap('#cn-prefectures-quiz-panel [data-q=submit]');}
 await answer('taizhou');assert.match(await read('feedback'),/Add the province before or after the name/);assert.doesNotMatch(await read('feedback'),/Jiangsu|Zhejiang|泰州|台州/);assert.match(await read('progress'),/^0 \//);
 await answer('taizhou jiangsu');assert.match(await read('progress'),/^1 \//);assert.match(await read('feedback'),/Taizhou/);
 await answer('Jiangsu Taizhou');assert.match(await read('progress'),/^1 \//);
 await answer('Taizhou (Zhejiang)');assert.match(await read('progress'),/^2 \//);
 await answer('taizhou');assert.match(await read('feedback'),/Add the province before or after the name/);assert.doesNotMatch(await read('feedback'),/Jiangsu|Zhejiang|泰州|台州/);assert.match(await read('progress'),/^2 \//);
 await answer('Taizhou Guangdong');assert.match(await read('progress'),/^2 \//);
 await p.screenshot('qualified-quiz-names');
 }}];
