import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {romanizeKorean,koreanNameAliases,matchesKoreanSearch} from '../dist/korean-names.mjs';
import {aliases,createNameRound,submitName,normalizeName} from '../dist/name-quiz-engine.mjs';
import {quizNamePlace,answerSpecified} from '../dist/quiz-modes.mjs';
import {createRound,score} from '../dist/quiz-engine.mjs';
const data=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/korea-boundaries.bin',import.meta.url))));
const records=[...data.first.features,...data.second.features].map(f=>f.properties),byId=new Map(records.map(r=>[r.id,r]));
const cases=[
 ['KR-43','Chungbuk',"Ch'ungbuk",'Chungcheongbuk-do',"North Ch'ungch'ŏng"],
 ['KR-44','Chungnam',"Ch'ungnam",'Chungcheongnam-do'],
 ['KR-47','Gyeongbuk','Kyŏngbuk','Gyeongsangbuk-do','North Kyongsang'],
 ['KR-48','Gyeongnam','Kyŏngnam','Gyeongsangnam-do','South Kyongsang'],
 ['KR-52','Jeonbuk','North Jeolla','Jeollabuk-do','Chŏllabuk-do','North Cholla'],
 ['KR-26','Busan','Pusan'],['KR-27','Daegu','Taegu'],['KR-28','Incheon',"Inch'ŏn"],
 ['KR-30','Daejeon','Taejŏn'],['KR-41','Gyeonggi','Kyŏnggi'],['KR-50','Jeju','Cheju'],
 ['KR-51','Gangwon','Kangwon','Kangwŏn-do'],['KP-356535','Kangwon','Gangwon'],
 ['KP-356443','Pyongyang','Pyeongyang',"P’yŏngyang"],
 ['KP-5455268','Kaesong','Gaeseong','Kaesŏng'],['KP-356392','Chagang','Jagang'],
 ['KP-356419','South Pyongan','South Pyeongan','Pyeongannam-do',"P'yŏngannam-do"],
 ['KP-356540','North Pyongan','North Pyeongan','Pyeonganbuk-do'],
 ['KP-356386','South Hamgyong','South Hamgyeong','Hamgyeongnam-do'],
 ['KP-3781418','North Hamgyong','North Hamgyeong','Hamgyeongbuk-do'],
 ['KP-6648083','Rason','Raseon','Naseon'],['KP-356379','Ryanggang','Yanggang'],
 ['KP-8400380','Chongjin-si','Cheongjin-si',"Ch'ŏngjin-si"],
 ['KP-8400379','Hamhung-si','Hamheung','Hamhŭng-si'],
 ['KP-5486618','Kumgang County','Geumgang County','Kŭmgang-kun'],
 ['KP-8429865','Gimhyeongjik','Kim Hyeongjik','Kimhyŏngjik'],
 ['KP-5453088','Nyongbyon County','Nyeongbyeon','Yeongbyeon'],
 ['KP-5475709','Rangnim County','Rangnim','Nangnim'],
 ['KP-5469475','Unnyun County','Eunnyul','Ŭnnyul'],
 ['KR-11110','Jongno-gu','Chongno-ku'],['KR-51150','Gangneung-si','Kangnŭng-si'],
 ['KR-52110','Jeonju-si','Chŏnju-si'],['KR-47940','Ulleung-gun','Ullŭng-gun'],
];
let answers=0;
for(const [id,...values] of cases){
 const record=byId.get(id);assert(record,id);const place=quizNamePlace({...record,local:record.ko});
 for(const value of values){
  assert(aliases(place).has(normalizeName(value)),id+': '+value);
  const naming=createNameRound([place]);assert.equal(submitName(naming,value).status,'correct',id+': '+value);assert.equal(naming.spellingWarnings.size,0);
  const highlighted=createRound([{feature:{properties:{adcode:id}},record:{...record,local:record.ko}}]);assert.equal(answerSpecified(highlighted,value).status,'correct');assert.equal(score(highlighted).correct,1);
  assert(matchesKoreanSearch(record,value),'Search '+id+': '+value);answers++;
 }
}
// Every mapped place keeps its original names and gains both generated romanizations.
for(const record of records){
 const names=koreanNameAliases(record),local=record.ko.replace(/((?:통합)?특별자치도|특별자치시|통합특별시|특별시|광역시|구역|지구|도|시|군|구)(?:\s+직할)?$/u,'');
 assert(names.includes(romanizeKorean(local,'rr')),record.id+' RR');assert(names.includes(romanizeKorean(local,'mr')),record.id+' MR');
 assert(matchesKoreanSearch(record,record.en));assert(matchesKoreanSearch(record,record.ko));if(record.hanja)assert(matchesKoreanSearch(record,record.hanja));
}
assert.equal(romanizeKorean('부산','rr'),'Busan');assert.equal(romanizeKorean('부산','mr'),'Pusan');
assert.equal(romanizeKorean('종로','rr'),'Jongno');assert.equal(romanizeKorean('광명','mr'),'Kwangmyŏng');
assert.equal(romanizeKorean('백암','rr'),'Baegam');assert.equal(romanizeKorean('울릉','mr'),'Ullŭng');
assert(!matchesKoreanSearch(byId.get('KR-26'),'Bavaria'));assert(!matchesKoreanSearch(byId.get('KR-26')," ' - "));
assert(!matchesKoreanSearch(byId.get('KR-43'),'South Chungcheong'));
assert.deepEqual(koreanNameAliases({id:'US-CA',en:'California',ko:'부산'}),[],'No alias conversion outside Korea');
const northern=byId.get('KP-356535'),southern=byId.get('KR-51');
for(const value of ['Gangwon','Kangwon']){
 assert(matchesKoreanSearch(northern,value)&&matchesKoreanSearch(southern,value));
 const q=createNameRound([northern,southern].map(r=>quizNamePlace({...r,local:r.ko})));
 // Existing exact labels disambiguate otherwise identical names; scoped quizzes accept either form.
 assert(['correct','ambiguous'].includes(submitName(q,value).status));
}
const q=createRound([{feature:{properties:{adcode:'KR-43'}},record:{...byId.get('KR-43'),local:byId.get('KR-43').ko}}]);
assert.equal(answerSpecified(q,'Chungnam',undefined,records.filter(r=>r.level===1).map(r=>quizNamePlace({...r,local:r.ko}))).status,'incorrect','Another real province never receives spelling grace');
console.log(`Korean aliases: ${records.length} mapped places covered; ${answers} independent RR/MR/directional examples pass search and both typing modes.`);
