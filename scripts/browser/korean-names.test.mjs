import assert from 'node:assert/strict';
const selectValue=async(p,id,value)=>p.evaluate(`var el=document.getElementById(${JSON.stringify(id)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));`);
const submit=async(p,value)=>p.evaluate(`document.getElementById('quiz-korea-quiz-answer').value=${JSON.stringify(value)};document.querySelector('#quiz-korea-quiz-panel [data-q=form]').requestSubmit();`);
export default [
 {name:'Both romanizations find Korean provinces, cities, counties and districts',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#korea');
  const cases=[['Pusan','Busan'],['Kyŏnggi','Gyeonggi'],['Chungbuk','North Chungcheong'],['Gyeongnam','South Gyeongsang'],['Gangwon','Kangwon'],['Kangwon','Gangwon'],['Pyeongyang','Pyongyang'],['Gaeseong','Kaesong'],['Cheongjin','Chongjin'],['Geumgang','Kumgang'],['Chŏnju','Jeonju'],['Yeongbyeon','Nyongbyon']];
  for(const [query,expected] of cases){
   await p.evaluate(`var input=document.getElementById('k-search');input.value=${JSON.stringify(query)};input.dispatchEvent(new Event('input',{bubbles:true}));`);
   await p.waitFor(`!!document.querySelector('#k-search-results button')`,{label:'results for '+query});
   assert((await p.evaluate(`document.getElementById('k-search-results').textContent`)).includes(expected),query+' finds '+expected);
  }
  await p.evaluate(`var input=document.getElementById('k-search');input.value='Pusan';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();`);await p.key('Enter');await p.settle();
  assert((await p.evaluate(`document.getElementById('breadcrumb-region').textContent`)).includes('Busan'),'Alias result selects the real place');
  await p.screenshot('korean-romanization-search');
 }},
 {name:'South and North Korean naming quizzes accept the other romanization without warnings',options:{width:1280,height:960},async run(p,base){
  await p.open(base,'#korea');await p.evaluate(`AtlasSettings.setSettings({motion:'reduce'})`);
  for(const [scope,answers] of [['KR',['Pusan','Chungbuk','Kyŏnggi','Kangwon','North Jeolla']],['KP',['Pyeongyang','Gaeseong','Gangwon','Jagang','North Hamgyeong']]]){
   await p.tap('[aria-controls=quiz-korea-quiz-panel]');await selectValue(p,'quiz-korea-quiz-type','name');await selectValue(p,'quiz-korea-quiz-scope',scope);await p.tap('#quiz-korea-quiz-panel [data-q=start]');await p.settle();
   for(let i=0;i<answers.length;i++){
    await submit(p,answers[i]);assert((await p.evaluate(`document.querySelector('#quiz-korea-quiz-panel [data-q=feedback]').textContent`)).includes('correct'),scope+': '+answers[i]);
    assert.equal(await p.evaluate(`document.querySelector('#quiz-korea-quiz-panel [data-q=progress]').textContent`),(i+1)+' / '+(scope==='KR'?16:13)+' named');
   }
   await p.tap('#home');await p.settle();
  }
 }}
];
