// Korean place aliases are generated from Hangul, never by replacing letters in a user's answer.
// RR: https://www.korean.go.kr/front_eng/roman/roman_01.do
// MR: https://geonames.nga.mil/geonames/GNSSearch/GNSDocs/romanization/ROMANIZATION_OF_KOREAN-_MR_for_DPRK.pdf
const initials=[...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
const finals=[...' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];
const rrVowels=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const mrVowels=['a','ae','ya','yae','ŏ','e','yŏ','ye','o','wa','wae','oe','yo','u','wŏ','we','wi','yu','ŭ','ŭi','i'];
const rrInitial=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const mrInitial=['k','kk','n','t','tt','r','m','p','pp','s','ss','','ch','tch',"ch'","k'","t'","p'",'h'];
const finalSound={'ㄱ':'k','ㄲ':'k','ㄳ':'k','ㄴ':'n','ㄵ':'n','ㄶ':'n','ㄷ':'t','ㄹ':'l','ㄺ':'k','ㄻ':'m','ㄼ':'p','ㄽ':'l','ㄾ':'l','ㄿ':'p','ㅀ':'l','ㅁ':'m','ㅂ':'p','ㅄ':'p','ㅅ':'t','ㅆ':'t','ㅇ':'ng','ㅈ':'t','ㅊ':'t','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'t'};
const key=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const capital=value=>value?value[0].toUpperCase()+value.slice(1):value;
function syllables(word){return [...word.normalize('NFC')].map(c=>{const n=c.charCodeAt(0)-0xac00;return n>=0&&n<11172?{l:initials[Math.floor(n/588)],v:Math.floor(n/28)%21,t:finals[n%28].trim()}:null;});}

export function romanizeKorean(word,system='rr'){
 const parts=syllables(word);if(parts.some(p=>!p))return '';
 const mr=system==='mr',vowels=mr?mrVowels:rrVowels,onsets=mr?mrInitial:rrInitial;
 const heads=parts.map(p=>onsets[initials.indexOf(p.l)]),tails=parts.map(p=>finalSound[p.t]||'');
 // Word-medial voicing, liaison and nasal/liquid assimilation depend on syllable boundaries.
 for(let i=1;i<parts.length;i++){
  const previous=parts[i-1],current=parts[i],t=previous.t,l=current.l,sound=finalSound[t]||'';
  if(!t){if(mr)heads[i]=({'ㄱ':'g','ㄷ':'d','ㅂ':'b','ㅈ':'j'})[l]??heads[i];continue;}
  if(l==='ㅇ'&&t!=='ㅇ'){
   const liaison={'ㄱ':'g','ㄲ':'kk','ㄴ':'n','ㄷ':'d','ㄹ':'r','ㅁ':'m','ㅂ':'b','ㅅ':'s','ㅆ':'ss','ㅈ':mr?'j':'j','ㅊ':mr?"ch'":'ch','ㅋ':mr?"k'":'k','ㅌ':mr?"t'":'t','ㅍ':mr?"p'":'p','ㅎ':''};
   if(t in liaison){tails[i-1]='';heads[i]=liaison[t];if(current.v===20&&['ㄷ','ㅌ'].includes(t))heads[i]=t==='ㄷ'?'j':mr?"ch'":'ch';}
   continue;
  }
  if(l==='ㄹ'){
   if(sound==='n'||sound==='l'){tails[i-1]='l';heads[i]='l';}
   else{tails[i-1]=({k:'ng',t:'n',p:'m'})[sound]||sound;heads[i]='n';}
  }else if(l==='ㄴ'||l==='ㅁ'){
   tails[i-1]=({k:'ng',t:'n',p:'m'})[sound]||sound;
   if(sound==='l'&&l==='ㄴ')heads[i]='l';
  }else if(mr){
   // Stops are voiced after sonorants, but remain unvoiced after an obstruent.
   if(['n','m','ng','l'].includes(sound))heads[i]=({'ㄱ':'g','ㄷ':'d','ㅂ':'b','ㅈ':'j'})[l]??heads[i];
   if(sound==='t'&&['ㄱ','ㄷ','ㅂ','ㅅ','ㅈ'].includes(l)){tails[i-1]='';heads[i]=({'ㄱ':'kk','ㄷ':'tt','ㅂ':'pp','ㅅ':'ss','ㅈ':'tch'})[l];}
  }
 }
 return capital(parts.map((p,i)=>heads[i]+vowels[p.v]+tails[i]).join(''));
}
const suffix=/((?:통합)?특별자치도|특별자치시|통합특별시|특별시|광역시|구역|지구|도|시|군|구)(?:\s+직할)?$/u;
const rrUnits={'도':'do','시':'si','군':'gun','구':'gu','구역':'guyeok','지구':'jigu'};
const mrUnits={'도':'to','시':'si','군':'kun','구':'ku','구역':'guyŏk','지구':'chigu'};
const provinceAliases={
 'KR-43':['충북','North Chungcheong','Chungcheongbuk'],
 'KR-44':['충남','South Chungcheong','Chungcheongnam'],
 'KR-47':['경북','North Gyeongsang','Gyeongsangbuk'],
 'KR-48':['경남','South Gyeongsang','Gyeongsangnam'],
 'KR-52':['전북','전라북','North Jeolla','Jeonbuk','Jeollabuk'],
 'KR-12':['전남광주','Jeonnam-Gwangju'],
};
// Preserve established spellings and North/South initial-sound variants alongside generated forms.
const exceptions={'신안':['Sinan','Shinan'],'천리마':['Chollima','Cheollima','Chŏllima'], '은률':['Eunnyul','Ŭnnyul'], '락랑':['Rangnang','Nangnang']};
const cache=new Map(),searchCache=new WeakMap();
function southernInitial(word){
 const first=syllables(word)[0];if(!first)return word;
 let l=first.l;
 if(l==='ㄹ')l=[2,6,7,12,17,20].includes(first.v)?'ㅇ':'ㄴ';
 else if(l==='ㄴ'&&[6,12,17,20].includes(first.v))l='ㅇ';
 return String.fromCharCode(0xac00+initials.indexOf(l)*588+first.v*28+finals.indexOf(first.t||' '))+word.slice(1);
}
export function koreanNameAliases(place){
 const id=String(place.code??place.id??'');if(!/^(?:KR|KP)-/.test(id))return [];
 const local=String(place.ko||place.local||place.zh||'').split(/[·]/)[0].trim().normalize('NFC');
 const token=id+'|'+local+'|'+place.en;if(cache.has(token))return cache.get(token);
 const match=local.match(suffix),root=match?local.slice(0,match.index):local;
 const names=new Set([place.en, String(place.en||'').replace(/(?:\s+(?:Province|County|District|City|urban area)|-(?:si|gun|gu|guyok|chigu))$/i,''),...(place.aliases||[])]);
 const addHangul=(name,unit)=>{
  for(const form of new Set([name,southernInitial(name)]))for(const system of ['rr','mr']){
   const roman=romanizeKorean(form,system);if(!roman)continue;names.add(roman);
   if(unit){names.add(roman+'-'+(system==='mr'?mrUnits:rrUnits)[unit]);if(system==='mr')names.add(roman+'-'+rrUnits[unit]);}
  }
 };
 const unit=match?(rrUnits[match[1]]?match[1]:match[1].endsWith('도')?'도':'시'):null;
 addHangul(root,unit);
 for(const system of ['rr','mr']){const full=romanizeKorean(local,system);if(full)names.add(full);if(match){const ending=romanizeKorean(match[1],system);for(const form of new Set([root,southernInitial(root)])){const base=romanizeKorean(form,system);if(base&&ending)names.add(base+'-'+ending.toLowerCase());}}}
 for(const name of provinceAliases[id]||[])if(/[가-힣]/u.test(name))addHangul(name,id==='KR-12'?'시':'도');else names.add(name);
 for(const name of exceptions[root]||[]){names.add(name);if(unit){names.add(name+'-'+rrUnits[unit]);names.add(name+'-'+mrUnits[unit]);}}
 if(root.startsWith('김'))for(const name of [...names])if(name.startsWith('Gim'))names.add('Kim'+name.slice(3));
 if(id==='KR-52')for(const system of ['rr','mr'])names.add('North '+romanizeKorean('전라',system));
 if(unit==='도'&&root.length>=3&&/[남북]$/u.test(root)){
  const direction=root.endsWith('북')?'North':'South',stem=root.slice(0,-1);
  addHangul(root[0]+root.at(-1),'도');
  for(const system of ['rr','mr']){const roman=romanizeKorean(stem,system);if(roman){names.add(direction+' '+roman);names.add(direction+' '+roman+' Province');}}
 }
 // Add ordinary English generic terms without requiring their Korean equivalent.
 const generic=unit==='도'?'Province':unit==='시'?'City':unit==='군'?'County':['구','구역'].includes(unit)?'District':unit==='지구'?'Area':null;
 if(generic)for(const name of [...names])if(name&&!/\s(?:Province|City|County|District|Area)$/i.test(name)&&!/-[a-zŏŭ']+$/i.test(name))names.add(name+' '+generic);
 const result=[...names].filter(Boolean);cache.set(token,result);return result;
}
export function koreanSearchTerms(place){if(!searchCache.has(place))searchCache.set(place,[...new Set([place.en,place.ko,place.hanja,...koreanNameAliases(place)].filter(Boolean).map(key))]);return searchCache.get(place);}
export function matchesKoreanSearch(place,query){const text=key(query);return !!text&&koreanSearchTerms(place).some(name=>name.includes(text));}
