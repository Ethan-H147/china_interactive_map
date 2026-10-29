import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../dist/',import.meta.url);
// Division quizzes use native map data; only China's prefecture library is generated here.
const china=JSON.parse(fs.readFileSync(new URL('data/china-regions.json',root))),english=vm.runInNewContext('('+fs.readFileSync(new URL('app.js',root),'utf8').match(/const english=(\{[^;]+\});/)[1]+')');
const prefectureScopes=china.provinces.map(f=>({id:String(f.properties.adcode),label:english[f.properties.adcode],local:f.properties.name,count:china.subdivisions.filter(r=>r.properties.provinceCode===f.properties.adcode&&(r.properties.level==='taiwan-region'||r.properties.level==='city'&&String(r.properties.adcode).slice(2,4)!=='90')).length})).filter(s=>s.count).sort((a,b)=>a.label.localeCompare(b.label));
fs.writeFileSync(new URL('data/quiz/library.json',root),JSON.stringify({prefectureScopes})+'\n');
