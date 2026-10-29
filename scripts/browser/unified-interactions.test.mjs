import assert from 'node:assert/strict';
export default [
 {name:'China prefectures share quiz modes, Taiwan scopes and saved-round migration',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#china');await p.evaluate('AtlasSettings.setSettings({motion:"reduce"})');await p.tap('#tab-quiz');await p.evaluate("chinaQuizLevel='prefectures';openChinaQuiz()");
  const panel='#cn-prefectures-quiz-panel';assert.equal(await p.evaluate('chinaPrefectureRecords().length'),355);
  assert.match(await p.evaluate(`document.querySelector('${panel} [data-q=count]').textContent`),/^333 /);
  await p.evaluate(`localStorage.setItem('china-atlas-name-quiz-v2:guest',JSON.stringify({drafts:{'440000':{found:[440100],hinted:[],elapsed:12000}}}));chinaPrefectureQuiz.open({scope:'440000',mode:'name'})`);
  assert(!await p.evaluate(`document.querySelector('${panel} [data-q=resume]').hidden`));await p.tap(panel+' [data-q=resume]');await p.settle();
  assert.match(await p.evaluate(`document.querySelector('${panel} [data-q=progress]').textContent`),/^1 \/ 21 named/);
  await p.evaluate(`document.getElementById('cn-prefectures-quiz-answer').value='Shenzhen';document.querySelector('${panel} [data-q=form]').requestSubmit()`);
  assert.match(await p.evaluate(`document.querySelector('${panel} [data-q=feedback]').textContent`),/correct/);await p.tap('#home');await p.settle();
  await p.tap('#tab-quiz');await p.evaluate(`chinaPrefectureQuiz.open({scope:'710000',mode:'identify'})`);assert.match(await p.evaluate(`document.querySelector('${panel} [data-q=count]').textContent`),/^22 /);
  await p.tap(panel+' [data-q=start]');await p.settle();const target=await p.evaluate(`chinaPrefectureRecords().find(r=>map.getFeatureState({source:'prefectures',id:regionByCode.get(Number(r.id))?.feature.properties.adcode||r.id}).quizTarget)`);assert(target);
  await p.evaluate(`document.getElementById('cn-prefectures-quiz-answer').value=${JSON.stringify(target.en)};document.querySelector('${panel} [data-q=form]').requestSubmit()`);assert.equal(await p.evaluate(`document.querySelector('${panel} [data-q=feedback]').textContent`),'Correct');
  assert(!await p.evaluate(`map.getLayer('province-selection-repaired')`));await p.tap('#home');await p.settle();assert(!await p.evaluate('quiz.active'));
 }},
 {name:'US counties borrow normal per-state sources and restore the selected state',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#united-states');await p.evaluate('AtlasSettings.setSettings({motion:"reduce"})');await p.tap('#us-tab-quiz');
  await p.evaluate(`void currentAtlas().countyQuiz.open({scope:'US-DE',mode:'identify'})`);const panel='#us-counties-quiz-panel';await p.waitFor(`document.querySelector('${panel}')&&!document.querySelector('${panel}').hidden`);await p.tap(panel+' [data-q=start]');await p.settle();await p.waitFor('quiz.active');
  assert(!p.requests.some(url=>/data\/quiz\/us-counties\/US-DE\.bin/.test(url)),'No simplified quiz geography');assert(await p.evaluate("!!map.getSource('united-states-second')"),'Normal county source');
  const result=await p.evaluate(`(()=>{const fills=currentAtlas().quizMap.forLevel(2).fillLayers();return{fills,ids:fills.flatMap(id=>map.querySourceFeatures(map.getLayer(id).source).filter(f=>map.getFeatureState({source:map.getLayer(id).source,id:f.properties.id}).quizTarget).map(f=>f.properties.id))}})()`);assert(result.fills.length);assert(result.ids.length);
  await p.tap(panel+' [data-q=reveal]');await p.tap(panel+' [data-q=next]');await p.settle();await p.tap('#home');await p.settle();assert(!await p.evaluate('quiz.active'));
 }},
 {name:'Regional highlights use feature state, keep logical picking and share solid fill',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#russia');await p.evaluate('AtlasSettings.setSettings({motion:"reduce"})');
  await p.evaluate(`window.filterChanges=[];const original=map.setFilter.bind(map);map.setFilter=(id,filter,...rest)=>{window.filterChanges.push(id);return original(id,filter,...rest);};document.getElementById('ru-province').value='RU-MOW';document.getElementById('ru-province').dispatchEvent(new Event('change'))`);await p.settle();
  const layers=await p.evaluate(`map.getStyle().layers.filter(l=>l.id.startsWith('russia-')&&(l.id.endsWith('-selected')||l.id.endsWith('-selection-fill'))).map(l=>({id:l.id,filter:l.filter,opacity:l.paint[l.type==='fill'?'fill-opacity':'line-opacity'],logical:map.getFilter(l.id)}))`);assert(layers.length);assert(layers.every(l=>l.filter===undefined||l.filter===null),'No tile-rebuilding selection filters');assert(layers.some(l=>JSON.stringify(l.opacity).includes('_atlasSelection:')));assert(layers.some(l=>JSON.stringify(l.logical).includes('RU-MOW')));
  await p.screenshot('unified-russia-highlight');
 }}
];
