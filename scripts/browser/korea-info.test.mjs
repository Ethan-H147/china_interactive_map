import assert from 'node:assert/strict';
const checkReader=async p=>{
 assert.equal(await p.evaluate(`document.querySelectorAll('#korean-vowel-table tbody tr').length`),21);
 assert.equal(await p.evaluate(`document.querySelectorAll('#korean-consonant-table tbody tr').length`),19);
 assert.equal(await p.evaluate(`document.querySelectorAll('#korean-cluster-table tbody tr').length`),11);
 assert(await p.evaluate(`document.querySelector('#k-romanization .korean-reader-body').scrollHeight>document.querySelector('#k-romanization .korean-reader-body').clientHeight`));
 assert.equal(await p.evaluate(`document.querySelectorAll('dialog[open]').length`),1);
};
export default [
 {name:'Korea Extra info article opens, navigates, and restores focus without interfering with quizzes',options:{width:1360,height:980},async run(p,base){
  await p.open(base,'#korea');await p.tap('#k-tab-extra');assert(await p.evaluate(`!document.getElementById('k-extra-panel').hidden`));
  assert.equal(await p.evaluate(`document.getElementById('k-tab-extra').getAttribute('aria-pressed')`),'true');
  await p.tap('#k-romanization-open');await p.waitFor(`document.getElementById('k-romanization').open`);await checkReader(p);await p.screenshot('korean-article-desktop');
  await p.tap('[data-korean-section=vowels]');assert.equal(await p.evaluate(`document.activeElement.id`),'korean-vowels-title');assert.equal(await p.evaluate('location.hash'),'#korea');await p.screenshot('korean-vowels-desktop');
  await p.key('Escape');assert(!await p.evaluate(`document.getElementById('k-romanization').open`));assert.equal(await p.evaluate('document.activeElement.id'),'k-romanization-open');
  await p.tap('[aria-controls=quiz-korea-quiz-panel]');assert(await p.evaluate(`document.getElementById('k-extra-panel').hidden`));await p.tap('#k-tab-extra');assert(await p.evaluate(`document.getElementById('quiz-korea-quiz-panel').hidden`));
  await p.tap('#k-tab-layers');assert(await p.evaluate(`document.getElementById('k-extra-panel').hidden`));
  await p.tap('#k-about-open');assert(await p.evaluate(`document.getElementById('k-about').open`));await p.key('Escape');
  await p.evaluate(`document.getElementById('k-search').value='Pusan';document.getElementById('k-search').dispatchEvent(new Event('input'));`);await p.tap('#k-search-results button');await p.settle();
  assert.equal(await p.evaluate(`document.getElementById('k-tab-explore').getAttribute('aria-pressed')`),'true');await p.tap('#k-tab-extra');await p.tap('#k-romanization-open');
  await p.evaluate(`location.hash='japan'`);await p.settle();assert(!await p.evaluate(`document.getElementById('k-romanization').open`),'Reader closes when leaving Korea');
 }},
 {name:'Phone article tables scroll inside the reader and the close button stays available',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#korea');await p.evaluate(`AtlasSheet.expand()`);await p.tap('#k-tab-extra');await p.tap('#k-romanization-open');await checkReader(p);
  assert(await p.evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),'No page-level horizontal overflow');
  assert(await p.evaluate(`(()=>{var r=document.getElementById('k-romanization').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()`));
  await p.tap('[data-korean-section=consonants]');await p.screenshot('korean-consonants-phone');
  assert(await p.evaluate(`(()=>{var w=document.getElementById('korean-consonant-table').parentElement;w.scrollLeft=180;return w.scrollLeft>0})()`),'Wide table scrolls independently');
  assert(await p.evaluate(`(()=>{var r=document.getElementById('k-romanization-close').getBoundingClientRect();return r.top>=0&&r.bottom<innerHeight})()`));
  await p.tap('#k-romanization-close');assert(!await p.evaluate(`document.getElementById('k-romanization').open`));
 }}
];
