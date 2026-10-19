import assert from 'node:assert/strict';
export const normalizeJapanese=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'').replaceAll('ケ','ヶ').replaceAll('惠','恵');
export function parseMIC(text){
 const rows=[];let row;
 for(const line of text.replaceAll('\f','\n').split(/\r?\n/)){
  const m=/^\s*([0-9]+(?:-[0-9]+)?)\s+(.*?)\s+([0-9]{1,4})\s+(CDE|DE|E|BCDE)\s*$/.exec(line);
  if(m){row={numberingArea:m[1],coverage:m[2].trim(),code:'0'+m[3],localDigits:m[4]};rows.push(row);}
  else if(row&&line.trim()&&!/番号区画|市外局番|市内局番|令和|＜|^\s*\d+\s*$|注[:：]|市外局番は/.test(line))row.coverage+=line.trim();
 }
 assert.equal(rows.length,582,'Review MIC numbering-area rows');assert.equal(new Set(rows.map(r=>r.code)).size,387,'Full domestic codes, including leading zero');return rows;
}
function splitTop(text){const out=[];let start=0,depth=0;for(let i=0;i<text.length;i++){if(text[i]==='(')depth++;else if(text[i]===')')depth--;if(depth===0){const sep=text[i]==='、'?1:text.slice(i,i+2)==='及び'?2:text.slice(i,i+3)==='並びに'?3:0;if(sep){out.push(text.slice(start,i));i+=sep-1;start=i+1;}}}out.push(text.slice(start));return out.filter(Boolean);}
export function assignMIC(rows,catalogue,prefectures){
 const prefNames=prefectures.map(p=>({id:p.id,name:normalizeJapanese(p.ja)})).sort((a,b)=>b.name.length-a.name.length),byId=new Map(catalogue.map(r=>[r.id,r])),cities=catalogue.filter(r=>r.level===2&&!r.disputed),leaves=catalogue.filter(r=>r.level===3||r.level===2&&r.kind!=='Designated city').filter(r=>!r.disputed),assignments=new Map(leaves.map(r=>[r.id,[]])),unmatched=[];
 const prefOf=r=>r.level===3?r.prefecture:r.parent,leafList=city=>city.kind==='Designated city'?leaves.filter(r=>r.parent===city.id):[city];
 const add=(r,row,partial,atom)=>{const list=assignments.get(r.id);if(list&&!list.some(a=>a.code===row.code&&a.numberingArea===row.numberingArea))list.push({code:row.code,numberingArea:row.numberingArea,partial,clause:atom});};
 for(const row of rows){let pref,county='';for(let atom of splitTop(normalizeJapanese(row.coverage).replaceAll('篠山市','丹波篠山市'))){
  const written=atom;const named=prefNames.find(p=>atom.startsWith(p.name));if(named){pref=named.id;county='';atom=atom.slice(named.name.length);}if(!pref){unmatched.push({code:row.code,atom:written,reason:'No explicit prefecture'});continue;}
  const options=cities.filter(c=>c.parent===pref),ward23=atom.startsWith('23区');if(ward23){for(const c of options.filter(c=>c.kind==='Special ward'))add(c,row,false,written);continue;}
  const district=options.map(c=>normalizeJapanese(c.district)).filter(Boolean).sort((a,b)=>b.length-a.length).find(d=>atom.startsWith(d));if(district){county=district;atom=atom.slice(district.length);}
  else if(options.some(c=>!c.district&&atom.startsWith(normalizeJapanese(c.ja)))||!options.some(c=>atom.startsWith(normalizeJapanese(c.ja))))county='';
  const candidates=options.filter(c=>(!county||normalizeJapanese(c.district)===county)&&atom.startsWith(normalizeJapanese(c.ja))).sort((a,b)=>b.ja.length-a.ja.length);
  let selected=candidates.length?[candidates[0]]:district?options.filter(c=>normalizeJapanese(c.district)===district):atom===''||atom.startsWith('(')?options:[];
  const suffix=candidates.length?atom.slice(normalizeJapanese(candidates[0].ja).length):atom;
  if(!candidates.length&&suffix.startsWith('(')){
   const include=/に限る。?\)$/.test(suffix),mentioned=selected.filter(c=>suffix.includes(normalizeJapanese(c.ja)));if(mentioned.length&&include)selected=mentioned;else if(mentioned.length&&/を除く。?\)$/.test(suffix))selected=selected.filter(c=>!splitTop(suffix.slice(1,-1).replace(/を除く。?$/,'')).includes(normalizeJapanese(c.ja)));
  }
  if(!selected.length){unmatched.push({code:row.code,atom:written,reason:'No exact municipality or district'});continue;}
  for(const city of selected){let children=leafList(city),partial=!!suffix;
   if(city.kind==='Designated city'&&suffix){const namedWards=children.filter(w=>suffix.includes(normalizeJapanese(w.ja))),direct=children.filter(w=>suffix.startsWith(normalizeJapanese(w.ja)));if(direct.length){children=direct;partial=suffix!==normalizeJapanese(direct[0].ja);}else if(namedWards.length&&/に限る。?\)$/.test(suffix))children=namedWards;else if(namedWards.length&&/を除く。?\)$/.test(suffix)){const terms=splitTop(suffix.slice(1,-1).replace(/を除く。?$/,''));children=children.filter(w=>!terms.includes(normalizeJapanese(w.ja)));}}
   for(const leaf of children)add(leaf,row,partial,written);
  }
 }}
 return {leaves,assignments,unmatched};
}