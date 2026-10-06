// Runs before styles and map imports, so a returning visitor never sees the
// wrong country's title or loading screen while boundaries are downloaded.
(()=>{
 const countries={philippines:{en:'Philippines',local:'Pilipinas',lang:'fil',background:'#edf2f8'},indonesia:{en:'Indonesia',local:'',lang:'id',background:'#faf1ef'},japan:{en:'Japan',local:'日本',lang:'ja',background:'#f5f5f5'},china:{en:'China',local:'中国',lang:'zh',background:'#f4f0e7'},korea:{en:'Korea',local:'한반도',lang:'ko',background:'#edf1f6'},mongolia:{en:'Mongolia',local:'Монгол',lang:'mn-Cyrl',background:'#eaf1f5'}};
 const storageKey='boundary-atlas-country-v1';
 const fromHash=hash=>/^#(china|korea|mongolia|japan|philippines|indonesia)(?:\/(?:place|view)=.*)?$/i.exec(hash)?.[1].toLowerCase()||(hash.startsWith('#place=')?'china':null);
 let saved;try{saved=localStorage.getItem(storageKey);}catch{}
 const initial=fromHash(location.hash)||(countries[saved]?saved:'china');
 let current=initial;
 const root=document.documentElement;root.dataset.atlas=initial;root.dataset.starting='true';
 function persist(country){try{localStorage.setItem(storageKey,country);}catch{}}
 function setUrl(country,preservePlace=true){
  if(preservePlace&&location.hash.startsWith('#'+country+'/view='))return;
  const place=country==='china'&&preservePlace?(/^#(?:china\/)?place=(.*)$/.exec(location.hash)?.[1]??null):null;
  history.replaceState(null,'',location.pathname+location.search+'#'+country+(place!==null?'/place='+place:''));
 }
 if(initial){persist(initial);setUrl(initial);document.title=countries[initial].en+(countries[initial].local?' · '+countries[initial].local:'');}
 function paint(){
  const info=countries[current];root.dataset.atlas=current;document.body.dataset.atlas=current;
  const $=id=>document.getElementById(id);
  if($('atlas-title-english')){$('atlas-title-english').textContent=info?.en||'Atlas';$('atlas-title-english').className=current==='china'?'china-english':'korea-english';}
  if($('atlas-title-local')){$('atlas-title-local').textContent=info?.local||'';$('atlas-title-local').className=current==='china'?'china-chinese':current==='korea'?'korean-title':current==='japan'?'japanese-title':'mongolia-title';$('atlas-title-local').lang=info?.lang||'en';}
  document.title=info.en+(info.local?' · '+info.local:'');
  document.querySelectorAll('[data-country-symbol]').forEach(el=>{el.innerHTML=info?AtlasSymbols.markup(current):'';});
  if($('loading-label'))$('loading-label').textContent=info?'Loading '+info.en+' map…':'Loading atlas…';
  if($('startup-name'))$('startup-name').textContent=info?'Preparing '+info.en+'…':'Preparing maps…';
  if($('home'))$('home').textContent='All '+(info?.en||'countries');
  if($('map')&&info)$('map').setAttribute('aria-label',current==='china'?'Interactive China administrative boundary map':current==='korea'?'Interactive map of North and South Korea':current==='japan'?'Interactive Japan prefecture map':current==='mongolia'?'Interactive Mongolia province and district map':'Interactive '+info.en+' administrative boundary and island map');
 }
 window.AtlasEntry={initial,countries,fromHash,mount:paint,remember(country,{preservePlace=true}={}){if(!countries[country])return;current=country;persist(country);setUrl(country,preservePlace);paint();},ready(){delete root.dataset.starting;},get current(){return current;}};
 window.addEventListener('hashchange',()=>{const country=fromHash(location.hash);if(root.dataset.starting&&country)window.AtlasEntry.remember(country);});
})();
